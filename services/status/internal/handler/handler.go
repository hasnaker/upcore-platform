// Package handler exposes the status service HTTP endpoints.
//
// Three route groups:
//
//   - /api/v2/*  — public Atlassian-Statuspage-compatible JSON API.
//     No auth, cacheable.
//
//   - /api/v1/admin/status/* — incident/component/maintenance CRUD for
//     the internal admin panel. Guarded by requireAdmin middleware.
//
//   - /webhooks/azure-monitor — signature-checked webhook entry
//     that maps Azure alerts to component status changes.
package handler

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/status/internal/service"
	"github.com/upcore/status/internal/subscriber"
)

// Handler is the HTTP layer of the status service.
type Handler struct {
	DB            *sqlx.DB
	Svc           *service.Service
	Mailer        subscriber.Mailer
	PublicBaseURL string
	AdminRoles    map[string]struct{}
	AzureSecret   string

	// publicCache is a process-local 30s TTL cache for public GET endpoints.
	// Initialised lazily by publicCacheMiddleware on first use; see cache.go.
	// Admin handlers call InvalidateAll() after mutation so visitors see
	// changes within milliseconds instead of the 30s window.
	publicCache *publicCache
}

// Config wires optional dependencies at construction time.
type Config struct {
	PublicBaseURL string
	AdminRoles    []string
	AzureSecret   string
	Mailer        subscriber.Mailer
}

// New constructs a handler from Config. If cfg.Mailer is nil, a NoopMailer
// is used (useful for tests and dev).
func New(db *sqlx.DB, svc *service.Service, cfg Config) *Handler {
	if cfg.PublicBaseURL == "" {
		cfg.PublicBaseURL = "https://status.upcore.io"
	}
	if len(cfg.AdminRoles) == 0 {
		cfg.AdminRoles = []string{"upcore_staff", "platform_admin", "admin"}
	}
	set := map[string]struct{}{}
	for _, r := range cfg.AdminRoles {
		set[strings.TrimSpace(r)] = struct{}{}
	}
	var mailer subscriber.Mailer = subscriber.NoopMailer{}
	if cfg.Mailer != nil {
		mailer = cfg.Mailer
	}
	return &Handler{
		DB:            db,
		Svc:           svc,
		Mailer:        mailer,
		PublicBaseURL: cfg.PublicBaseURL,
		AdminRoles:    set,
		AzureSecret:   cfg.AzureSecret,
	}
}

// RegisterPublic mounts the public /api/v2 routes on a chi router.
//
// Read-only, idempotent endpoints (status summary, components list, incidents
// list/feeds, scheduled maintenances) are wrapped in a 30s in-memory cache so
// that a traffic spike on the public status page cannot pin a postgres pool.
// Mutating endpoints (subscribe / confirm / unsubscribe) bypass the cache.
func (h *Handler) RegisterPublic(r chi.Router) {
	if h.publicCache == nil {
		h.publicCache = newPublicCache()
	}
	r.Group(func(cached chi.Router) {
		cached.Use(h.publicCacheMiddleware)
		cached.Get("/status", h.GetStatusSummary)
		cached.Get("/components", h.ListComponents)
		cached.Get("/incidents", h.ListIncidentsHandler)
		cached.Get("/incidents/unresolved", h.ListUnresolvedIncidents)
		cached.Get("/incidents/{id}", h.GetIncidentHandler)
		cached.Get("/scheduled-maintenances", h.ListMaintenance)
		cached.Get("/rss", h.RSS)
		cached.Get("/rss.xml", h.RSS)
		cached.Get("/atom", h.Atom)
		cached.Get("/atom.xml", h.Atom)
	})
	r.Post("/subscribe", h.Subscribe)
	r.Get("/subscribe/confirm", h.ConfirmSubscribe)
	r.Get("/unsubscribe", h.Unsubscribe)
}

// RegisterAdmin mounts the authenticated admin CRUD.
func (h *Handler) RegisterAdmin(r chi.Router) {
	r.Use(h.requireAdmin)
	r.Post("/incidents", h.AdminCreateIncident)
	r.Post("/incidents/{id}/updates", h.AdminAppendUpdate)
	r.Post("/incidents/{id}/resolve", h.AdminResolveIncident)
	r.Post("/components/{id}/status", h.AdminSetComponentStatus)
	r.Post("/maintenance", h.AdminCreateMaintenance)
	r.Get("/subscribers", h.AdminListSubscribers)
}

// RegisterWebhooks mounts the unauthenticated-but-secret-signed webhook.
func (h *Handler) RegisterWebhooks(r chi.Router) {
	r.Post("/azure-monitor", h.AzureMonitorWebhook)
}

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

// GetStatusSummary returns the Atlassian-compatible summary payload.
func (h *Handler) GetStatusSummary(w http.ResponseWriter, r *http.Request) {
	global, comps, err := h.Svc.RollupGlobalStatus(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("status_unavailable", err))
		return
	}
	incs, err := h.Svc.ListIncidents(r.Context(), 7, true)
	if err != nil {
		incs = nil
	}
	maint, _ := h.Svc.UpcomingMaintenance(r.Context())

	// Atlassian format subset.
	resp := map[string]any{
		"page": map[string]any{
			"id":         "upcore",
			"name":       "UpCore",
			"url":        h.PublicBaseURL,
			"updated_at": time.Now().UTC().Format(time.RFC3339),
		},
		"status": map[string]any{
			"indicator":   atlasIndicator(global),
			"description": atlasDescription(global),
		},
		"components":             toPublicComponents(comps),
		"incidents":              toPublicIncidents(incs),
		"scheduled_maintenances": toPublicMaintenance(maint),
	}
	w.Header().Set("Cache-Control", "public, max-age=30")
	writeJSON(w, http.StatusOK, resp)
}

// ListComponents returns all components.
func (h *Handler) ListComponents(w http.ResponseWriter, r *http.Request) {
	comps, err := h.Svc.ListComponents(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("list_failed", err))
		return
	}
	// Attach 90-day rollups if ?with_history=true.
	if r.URL.Query().Get("with_history") == "true" {
		type augmented struct {
			service.Component
			History []service.DailyRollup `json:"history"`
		}
		out := make([]augmented, 0, len(comps))
		for _, c := range comps {
			hist, _ := h.Svc.DailyRollupRange(r.Context(), c.ID, 90)
			out = append(out, augmented{Component: c, History: hist})
		}
		writeJSON(w, http.StatusOK, map[string]any{"components": out})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"components": comps})
}

// ListIncidentsHandler returns the last 90 days of incidents.
func (h *Handler) ListIncidentsHandler(w http.ResponseWriter, r *http.Request) {
	days := parseIntQuery(r, "days", 90)
	incs, err := h.Svc.ListIncidents(r.Context(), days, false)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("list_failed", err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"incidents": incs})
}

// ListUnresolvedIncidents returns only active incidents.
func (h *Handler) ListUnresolvedIncidents(w http.ResponseWriter, r *http.Request) {
	incs, err := h.Svc.ListIncidents(r.Context(), 90, true)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("list_failed", err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"incidents": incs})
}

// GetIncidentHandler returns an incident + its update timeline.
func (h *Handler) GetIncidentHandler(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_id", err))
		return
	}
	inc, err := h.Svc.GetIncident(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError("not_found", err))
		return
	}
	updates, _ := h.Svc.ListIncidentUpdates(r.Context(), id)
	writeJSON(w, http.StatusOK, map[string]any{
		"incident": inc,
		"updates":  updates,
	})
}

// ListMaintenance returns upcoming maintenance windows.
func (h *Handler) ListMaintenance(w http.ResponseWriter, r *http.Request) {
	m, err := h.Svc.UpcomingMaintenance(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("list_failed", err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"scheduled_maintenances": m})
}

// RSS renders an RSS 2.0 feed of the last 30 days of incidents.
func (h *Handler) RSS(w http.ResponseWriter, r *http.Request) {
	incs, err := h.Svc.ListIncidents(r.Context(), 30, false)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("rss_failed", err))
		return
	}
	type rssItem struct {
		XMLName xml.Name `xml:"item"`
		Title   string   `xml:"title"`
		Link    string   `xml:"link"`
		GUID    string   `xml:"guid"`
		PubDate string   `xml:"pubDate"`
		Desc    string   `xml:"description"`
	}
	type channel struct {
		XMLName xml.Name  `xml:"channel"`
		Title   string    `xml:"title"`
		Link    string    `xml:"link"`
		Desc    string    `xml:"description"`
		Items   []rssItem `xml:"item"`
	}
	type rss struct {
		XMLName xml.Name `xml:"rss"`
		Version string   `xml:"version,attr"`
		Channel channel  `xml:"channel"`
	}
	items := make([]rssItem, 0, len(incs))
	for _, i := range incs {
		items = append(items, rssItem{
			Title:   fmt.Sprintf("[%s] %s", i.Status, i.Title),
			Link:    fmt.Sprintf("%s/status/incidents/%s", h.PublicBaseURL, i.ID),
			GUID:    i.ID.String(),
			PubDate: i.StartedAt.UTC().Format(time.RFC1123Z),
			Desc:    fmt.Sprintf("Etki: %s · Durum: %s", i.Impact, i.Status),
		})
	}
	feed := rss{
		Version: "2.0",
		Channel: channel{
			Title: "UpCore Status",
			Link:  h.PublicBaseURL + "/status",
			Desc:  "UpCore platform status ve incident akışı",
			Items: items,
		},
	}
	w.Header().Set("Content-Type", "application/rss+xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=120")
	_, _ = w.Write([]byte(xml.Header))
	_ = xml.NewEncoder(w).Encode(feed)
}

// Subscribe enrolls a new subscriber. For email, a double opt-in confirmation
// email is sent; for webhook, the URL is registered but not pinged.
func (h *Handler) Subscribe(w http.ResponseWriter, r *http.Request) {
	var req service.SubscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_payload", err))
		return
	}
	if req.Channel == "email" {
		if _, err := mail.ParseAddress(req.Target); err != nil {
			writeJSON(w, http.StatusBadRequest, apiError("invalid_email", err))
			return
		}
	}
	sub, err := h.Svc.Subscribe(r.Context(), req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("subscribe_failed", err))
		return
	}
	if sub.Channel == "email" && sub.ConfirmToken != nil {
		html, text := subscriber.ConfirmationTemplate(h.PublicBaseURL, *sub.ConfirmToken)
		msg := subscriber.Message{
			To:      sub.Target,
			Subject: "UpCore Status · aboneliğinizi doğrulayın",
			HTML:    html,
			Text:    text,
			Tag:     "status-confirmation",
		}
		if err := h.Mailer.Send(r.Context(), msg); err != nil {
			// We don't fail the API — user can retry from the confirm link.
			// But we log to help ops.
			h.Svc.Logger.Warn().Err(err).Str("to", sub.Target).Msg("confirmation email send failed")
		}
	}
	writeJSON(w, http.StatusAccepted, map[string]any{
		"id":      sub.ID,
		"channel": sub.Channel,
		"confirmation_required": sub.Channel == "email" && !sub.Confirmed,
	})
}

// ConfirmSubscribe activates a subscriber from a confirmation token.
func (h *Handler) ConfirmSubscribe(w http.ResponseWriter, r *http.Request) {
	tok := r.URL.Query().Get("token")
	ok, err := h.Svc.ConfirmSubscription(r.Context(), tok)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("confirm_failed", err))
		return
	}
	if !ok {
		writeJSON(w, http.StatusNotFound, apiError("token_invalid_or_expired", nil))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "confirmed"})
}

// Unsubscribe removes a subscriber by token.
func (h *Handler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	tok := r.URL.Query().Get("token")
	ok, err := h.Svc.Unsubscribe(r.Context(), tok)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("unsubscribe_failed", err))
		return
	}
	if !ok {
		writeJSON(w, http.StatusNotFound, apiError("token_not_found", nil))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "unsubscribed"})
}

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------

func (h *Handler) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		roles := r.Header.Get("X-User-Roles")
		if roles == "" {
			roles = r.Header.Get("X-User-Role")
		}
		for _, p := range strings.Split(roles, ",") {
			p = strings.TrimSpace(p)
			if _, ok := h.AdminRoles[p]; ok {
				next.ServeHTTP(w, r)
				return
			}
		}
		writeJSON(w, http.StatusForbidden, apiError("forbidden_admin_only", nil))
	})
}

// invalidatePublicCache drops the 30s in-memory public cache so new admin
// mutations are reflected immediately on the public status page.
func (h *Handler) invalidatePublicCache() {
	if h.publicCache != nil {
		h.publicCache.InvalidateAll()
	}
}

// AdminCreateIncident starts a new incident.
func (h *Handler) AdminCreateIncident(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title        string      `json:"title"`
		Impact       string      `json:"impact"`
		ComponentIDs []uuid.UUID `json:"component_ids"`
		InitialBody  string      `json:"initial_body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_payload", err))
		return
	}
	inc, err := h.Svc.CreateIncident(r.Context(), service.CreateIncidentParams{
		Title:        body.Title,
		Impact:       body.Impact,
		ComponentIDs: body.ComponentIDs,
		InitialBody:  body.InitialBody,
		CreatedBy:    r.Header.Get("X-User-ID"),
	})
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("create_failed", err))
		return
	}
	h.invalidatePublicCache()
	writeJSON(w, http.StatusCreated, inc)
}

// AdminAppendUpdate posts a new status update to an incident.
func (h *Handler) AdminAppendUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_id", err))
		return
	}
	var body struct {
		Status string `json:"status"`
		Body   string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_payload", err))
		return
	}
	upd, err := h.Svc.AppendIncidentUpdate(r.Context(), id, body.Status, body.Body, r.Header.Get("X-User-ID"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("update_failed", err))
		return
	}
	h.invalidatePublicCache()
	writeJSON(w, http.StatusCreated, upd)
}

// AdminResolveIncident resolves an incident (post-mortem required).
func (h *Handler) AdminResolveIncident(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_id", err))
		return
	}
	var body struct {
		PostmortemURL     string `json:"postmortem_url"`
		PostmortemSummary string `json:"postmortem_summary"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_payload", err))
		return
	}
	if err := h.Svc.ResolveIncident(r.Context(), id, body.PostmortemURL, body.PostmortemSummary, r.Header.Get("X-User-ID")); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("resolve_failed", err))
		return
	}
	h.invalidatePublicCache()
	writeJSON(w, http.StatusOK, map[string]string{"status": "resolved"})
}

// AdminSetComponentStatus lets an operator manually override a component's status.
func (h *Handler) AdminSetComponentStatus(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_id", err))
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_payload", err))
		return
	}
	if err := h.Svc.SetComponentStatus(r.Context(), id, body.Status); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("update_failed", err))
		return
	}
	h.invalidatePublicCache()
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// AdminCreateMaintenance schedules a new maintenance window.
func (h *Handler) AdminCreateMaintenance(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title          string      `json:"title"`
		Description    string      `json:"description"`
		ScheduledStart time.Time   `json:"scheduled_start"`
		ScheduledEnd   time.Time   `json:"scheduled_end"`
		ComponentIDs   []uuid.UUID `json:"component_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_payload", err))
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		writeJSON(w, http.StatusBadRequest, apiError("title_required", nil))
		return
	}
	createdBy := r.Header.Get("X-User-ID")
	var createdByP *string
	if createdBy != "" {
		createdByP = &createdBy
	}
	m, err := h.Svc.CreateMaintenance(r.Context(), service.MaintenanceWindow{
		Title:          body.Title,
		Description:    body.Description,
		ScheduledStart: body.ScheduledStart,
		ScheduledEnd:   body.ScheduledEnd,
		ComponentIDs:   service.UUIDArray(body.ComponentIDs),
		CreatedBy:      createdByP,
	})
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("create_failed", err))
		return
	}
	h.invalidatePublicCache()
	writeJSON(w, http.StatusCreated, m)
}

// AdminListSubscribers returns subscriber counts per channel.
func (h *Handler) AdminListSubscribers(w http.ResponseWriter, r *http.Request) {
	type row struct {
		Channel   string `db:"channel" json:"channel"`
		Total     int    `db:"total" json:"total"`
		Confirmed int    `db:"confirmed" json:"confirmed"`
	}
	var out []row
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT channel, COUNT(*) AS total,
		        SUM(CASE WHEN confirmed THEN 1 ELSE 0 END) AS confirmed
		   FROM app.status_subscribers
		  GROUP BY channel`); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("list_failed", err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

// AzureMonitorWebhook accepts an Azure Monitor action group payload and maps
// the alert's target resource to a status component via the component's code.
// The webhook is signature-checked via the X-Shared-Secret header.
func (h *Handler) AzureMonitorWebhook(w http.ResponseWriter, r *http.Request) {
	if h.AzureSecret != "" && r.Header.Get("X-Shared-Secret") != h.AzureSecret {
		writeJSON(w, http.StatusUnauthorized, apiError("invalid_signature", nil))
		return
	}
	var body struct {
		Data struct {
			Essentials struct {
				AlertRule     string `json:"alertRule"`
				MonitorCondition string `json:"monitorCondition"`
				TargetResource string `json:"targetResource"`
				ComponentCode  string `json:"componentCode"`
				Severity       string `json:"severity"`
			} `json:"essentials"`
		} `json:"data"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError("invalid_payload", err))
		return
	}
	code := body.Data.Essentials.ComponentCode
	if code == "" {
		writeJSON(w, http.StatusBadRequest, apiError("component_code_required", nil))
		return
	}
	comp, err := h.Svc.GetComponent(r.Context(), code)
	if err != nil {
		writeJSON(w, http.StatusNotFound, apiError("component_not_found", err))
		return
	}
	newStatus := service.StatusOperational
	if body.Data.Essentials.MonitorCondition == "Fired" {
		switch strings.ToLower(body.Data.Essentials.Severity) {
		case "sev0", "sev1", "critical":
			newStatus = service.StatusMajorOutage
		case "sev2", "error":
			newStatus = service.StatusPartialOutage
		default:
			newStatus = service.StatusDegraded
		}
	}
	if err := h.Svc.SetComponentStatus(r.Context(), comp.ID, newStatus); err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError("update_failed", err))
		return
	}
	h.invalidatePublicCache()
	writeJSON(w, http.StatusAccepted, map[string]any{
		"component": comp.Code,
		"status":    newStatus,
	})
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func apiError(code string, err error) map[string]string {
	out := map[string]string{"error": code}
	if err != nil {
		out["detail"] = err.Error()
	}
	return out
}

func parseIntQuery(r *http.Request, key string, def int) int {
	s := r.URL.Query().Get(key)
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return def
	}
	return n
}

func atlasIndicator(s string) string {
	switch s {
	case service.StatusMajorOutage:
		return "critical"
	case service.StatusPartialOutage:
		return "major"
	case service.StatusDegraded:
		return "minor"
	case service.StatusMaintenance:
		return "maintenance"
	}
	return "none"
}

func atlasDescription(s string) string {
	switch s {
	case service.StatusMajorOutage:
		return "Major Outage"
	case service.StatusPartialOutage:
		return "Partial Outage"
	case service.StatusDegraded:
		return "Degraded Performance"
	case service.StatusMaintenance:
		return "Scheduled Maintenance"
	}
	return "All Systems Operational"
}

func toPublicComponents(comps []service.Component) []map[string]any {
	out := make([]map[string]any, 0, len(comps))
	for _, c := range comps {
		out = append(out, map[string]any{
			"id":       c.ID,
			"name":     c.Name,
			"status":   c.Status,
			"group_id": c.Category,
		})
	}
	return out
}

func toPublicIncidents(incs []service.Incident) []map[string]any {
	out := make([]map[string]any, 0, len(incs))
	for _, i := range incs {
		out = append(out, map[string]any{
			"id":         i.ID,
			"name":       i.Title,
			"status":     i.Status,
			"impact":     i.Impact,
			"created_at": i.StartedAt,
			"resolved_at": i.ResolvedAt,
		})
	}
	return out
}

func toPublicMaintenance(m []service.MaintenanceWindow) []map[string]any {
	out := make([]map[string]any, 0, len(m))
	for _, w := range m {
		out = append(out, map[string]any{
			"id":              w.ID,
			"name":            w.Title,
			"status":          w.Status,
			"scheduled_for":   w.ScheduledStart,
			"scheduled_until": w.ScheduledEnd,
		})
	}
	return out
}


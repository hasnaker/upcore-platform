package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"

	"github.com/upcore/billing/internal/service"
)

// AdminHandler exposes platform-admin-only billing analytics endpoints.
//
// All routes are nested under /admin/billing. The handler assumes upstream
// (api-gateway + middleware) has already enforced the `upcore_staff` role —
// for defense-in-depth this handler additionally validates the
// X-User-Roles header carries a role matching one of the configured
// admin role names.
type AdminHandler struct {
	DB       *sqlx.DB
	Admin    *service.AdminService
	AdminRoles map[string]struct{} // "upcore_staff" / "platform_admin"
	ChurnFlagKey string            // feature flag key, default "admin_billing_churn_risk"
}

// NewAdminHandler constructs the admin handler. Provide a role set — if empty,
// defaults to {"upcore_staff","platform_admin","admin"}.
func NewAdminHandler(db *sqlx.DB, admin *service.AdminService, roles []string) *AdminHandler {
	set := map[string]struct{}{}
	if len(roles) == 0 {
		roles = []string{"upcore_staff", "platform_admin", "admin"}
	}
	for _, r := range roles {
		set[strings.TrimSpace(r)] = struct{}{}
	}
	return &AdminHandler{
		DB:           db,
		Admin:        admin,
		AdminRoles:   set,
		ChurnFlagKey: "admin_billing_churn_risk",
	}
}

// Register wires admin billing routes onto a router. Called with the
// /admin/billing subrouter by main.go.
func (h *AdminHandler) Register(r chi.Router) {
	r.Use(h.requireAdmin)
	r.Get("/summary", h.Summary)
	r.Get("/invoices", h.ListInvoices)
	r.Post("/invoices", h.ManualInvoice)
	r.Post("/stripe-portal", h.StripePortal)
	r.Get("/churn-risk", h.ChurnRisk)
}

// ---------------------------------------------------------------------------
// Middleware: platform-admin role gate
// ---------------------------------------------------------------------------

func (h *AdminHandler) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		roles := r.Header.Get("X-User-Roles")
		if roles == "" {
			roles = r.Header.Get("X-User-Role") // apikey style
		}
		parts := strings.Split(roles, ",")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if _, ok := h.AdminRoles[p]; ok {
				next.ServeHTTP(w, r)
				return
			}
		}
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden_admin_only"})
	})
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

// Summary GET /admin/billing/summary
func (h *AdminHandler) Summary(w http.ResponseWriter, r *http.Request) {
	sum, err := h.Admin.Summary(r.Context(), time.Now().UTC())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, sum)
}

// ListInvoices GET /admin/billing/invoices?status=&tenant_id=&from=&to=&limit=&offset=
func (h *AdminHandler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := service.InvoiceFilter{
		Status: strings.TrimSpace(q.Get("status")),
	}
	if tid := strings.TrimSpace(q.Get("tenant_id")); tid != "" {
		if id, err := uuid.Parse(tid); err == nil {
			f.TenantID = id
		}
	}
	if from := strings.TrimSpace(q.Get("from")); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			f.From = &t
		}
	}
	if to := strings.TrimSpace(q.Get("to")); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			f.To = &t
		}
	}
	if v, err := strconv.Atoi(q.Get("limit")); err == nil {
		f.Limit = v
	}
	if v, err := strconv.Atoi(q.Get("offset")); err == nil {
		f.Offset = v
	}

	items, total, err := h.Admin.ListInvoices(r.Context(), f)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"total":  total,
		"limit":  f.Limit,
		"offset": f.Offset,
	})
}

// ManualInvoice POST /admin/billing/invoices
func (h *AdminHandler) ManualInvoice(w http.ResponseWriter, r *http.Request) {
	var in service.ManualInvoiceInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad_request", "detail": err.Error()})
		return
	}
	inv, err := h.Admin.ManualInvoice(r.Context(), in)
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "invalid_invoice", "detail": err.Error()})
		return
	}
	h.audit(r, "admin.billing.manual_invoice", "billing_invoice", inv.ID, map[string]any{
		"tenant_id": in.TenantID,
		"total_try": inv.TotalTRY,
		"lines":     len(in.LineItems),
	})
	writeJSON(w, http.StatusCreated, inv)
}

// StripePortal POST /admin/billing/stripe-portal  body: {tenant_id, return_url?}
func (h *AdminHandler) StripePortal(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TenantID  uuid.UUID `json:"tenant_id"`
		ReturnURL string    `json:"return_url"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad_request"})
		return
	}
	if body.TenantID == uuid.Nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tenant_id_required"})
		return
	}
	if body.ReturnURL == "" {
		body.ReturnURL = "https://admin.upcore.io/billing"
	}
	url, err := h.Admin.CreatePortalSession(r.Context(), body.TenantID, body.ReturnURL)
	if err != nil {
		code := http.StatusUnprocessableEntity
		if errors.Is(err, errors.New("tenant has no Stripe customer")) {
			code = http.StatusNotFound
		}
		writeJSON(w, code, map[string]string{"error": "portal_session_failed", "detail": err.Error()})
		return
	}
	h.audit(r, "admin.billing.portal_session", "tenant", body.TenantID, map[string]any{
		"return_url": body.ReturnURL,
	})
	writeJSON(w, http.StatusOK, map[string]any{"url": url})
}

// ChurnRisk GET /admin/billing/churn-risk — requires feature flag.
func (h *AdminHandler) ChurnRisk(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if !h.churnFlagEnabled(r, tid) {
		writeJSON(w, http.StatusOK, map[string]any{
			"items":   []any{},
			"enabled": false,
		})
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	rows, err := h.Admin.ChurnRisk(r.Context(), limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": rows, "enabled": true})
}

// churnFlagEnabled checks app.feature_flags for a row matching the churn key
// (tenant-scoped override OR global). Defaults to false on any error.
func (h *AdminHandler) churnFlagEnabled(r *http.Request, tid uuid.UUID) bool {
	if h.DB == nil {
		return false
	}
	var enabled bool
	err := h.DB.GetContext(r.Context(), &enabled, `
		SELECT enabled FROM app.feature_flags
		 WHERE flag_key=$1 AND (tenant_id=$2 OR tenant_id IS NULL)
		 ORDER BY tenant_id NULLS LAST
		 LIMIT 1
	`, h.ChurnFlagKey, tid)
	if err != nil {
		return false
	}
	return enabled
}

// ---------------------------------------------------------------------------
// Audit log helper
// ---------------------------------------------------------------------------

// audit inserts an append-only audit_events row. Best-effort: failures are
// logged but never block the response path.
func (h *AdminHandler) audit(r *http.Request, action, resourceType string, resourceID uuid.UUID, payload map[string]any) {
	if h.DB == nil {
		return
	}
	tid := tenantID(r)
	uid, _ := uuid.Parse(strings.TrimSpace(r.Header.Get("X-User-Id")))
	email := strings.TrimSpace(r.Header.Get("X-User-Email"))
	ip := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if ip == "" {
		ip = r.RemoteAddr
	}
	ua := r.UserAgent()

	payloadJSON, _ := json.Marshal(payload)

	_, err := h.DB.ExecContext(r.Context(), `
		INSERT INTO audit_events (
			id, tenant_id, occurred_at, event_type, actor_type, actor_id, actor_email,
			resource_type, resource_id, service, action, result, ip_address, user_agent,
			correlation_id, changes, metadata, created_at
		) VALUES (
			$1, $2, NOW(), $3, 'admin', NULLIF($4::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
			NULLIF($5,''), $6, $7, 'billing', $8, 'success',
			NULLIF($9,'')::inet, NULLIF($10,''),
			NULLIF($11,''), NULL, $12::jsonb, NOW()
		)
	`,
		uuid.New(), tid, action, uid, email,
		resourceType, resourceID, action,
		ip, ua, r.Header.Get("X-Correlation-Id"), string(payloadJSON),
	)
	if err != nil {
		log.Warn().Err(err).Str("action", action).Msg("admin audit insert failed")
	}
}

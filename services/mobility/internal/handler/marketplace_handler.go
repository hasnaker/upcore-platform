package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/middleware"
	"github.com/upcore/mobility/internal/repository"
	"github.com/upcore/mobility/internal/service"
)

// Bu dosya marketplace handler'ının "opportunity" bölümünü kapsar:
// CRUD (Create/Get/UpdateStatus) + List. Application ve fit endpoint'leri
// `marketplace_application_handler.go` ve `marketplace_fit_handler.go`
// içinde tutulur. Hepsi aynı `MarketplaceHandler` struct'ına metod ekler;
// bu sayede tek `Register(r)` kayıt noktası korunur.

// MarketplaceHandler exposes dahili kariyer marketplace.
type MarketplaceHandler struct {
	repo    repository.MarketplaceRepository
	matcher *service.TalentMatching
	logger  zerolog.Logger
}

// NewMarketplaceHandler constructs.
func NewMarketplaceHandler(r repository.MarketplaceRepository, logger zerolog.Logger) *MarketplaceHandler {
	return &MarketplaceHandler{repo: r, matcher: service.NewTalentMatching(), logger: logger}
}

// Register wires routes onto /marketplace.
//
// Tek route grubu — handler dosya bölünmüş olsa da URL yapısı aynı kalır.
// Yeni endpoint eklenirken mantıksal grubu (opportunity / application / fit)
// hangi dosyaya gideceğine karar verilir; route burada tek satırla wire'lanır.
func (h *MarketplaceHandler) Register(r chi.Router) {
	r.Route("/marketplace", func(r chi.Router) {
		// Opportunities (this file)
		r.Get("/opportunities", h.ListOpenOpportunities)
		r.Post("/opportunities", h.CreateOpportunity)
		r.Get("/opportunities/{id}", h.GetOpportunity)
		r.Patch("/opportunities/{id}/status", h.UpdateStatus)

		// Applications (marketplace_application_handler.go)
		r.Post("/opportunities/{id}/apply", h.Apply)
		r.Get("/opportunities/{id}/applications", h.ListApplicationsForOpp)
		r.Get("/employees/{eid}/applications", h.ListApplicationsForEmployee)
		r.Patch("/applications/{id}/status", h.UpdateApplicationStatus)
		r.Post("/applications/{id}/withdraw", h.WithdrawApplication)

		// Fit / readiness (marketplace_fit_handler.go)
		r.Get("/opportunities/{id}/fit/{eid}", h.FitScore)
	})
}

// tid extracts tenant ID from the request context (set by TenantInjector
// middleware). Returns ok=false when middleware dropped the request.
func tid(r *http.Request) (uuid.UUID, bool) {
	return middleware.TenantID(r.Context())
}

// isHRRole returns true for roles allowed to manage internal applications.
// Listed roles can change opportunity status, view confidential applicants,
// and update application status. Employees themselves use only Apply +
// WithdrawApplication.
func isHRRole(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "hr", "hr_admin", "admin", "owner", "manager", "it_admin":
		return true
	}
	return false
}

// writeAudit is a fire-and-forget audit log wrapper. Failures are logged but
// never propagate — the user mutation already succeeded; we don't want a
// downstream audit failure to surface as a 500 to the user.
func (h *MarketplaceHandler) writeAudit(
	r *http.Request,
	tenantID uuid.UUID,
	userID uuid.UUID,
	action, resourceType string,
	resourceID uuid.UUID,
	payload map[string]any,
) {
	var raw []byte
	if payload != nil {
		raw, _ = json.Marshal(payload)
	}
	var uidPtr *uuid.UUID
	if userID != uuid.Nil {
		uidPtr = &userID
	}
	if err := h.repo.InsertAuditEvent(
		r.Context(), tenantID, uidPtr,
		middleware.Role(r.Context()), action, resourceType, resourceID, raw,
	); err != nil {
		h.logger.Warn().Err(err).Str("action", action).Msg("audit insert failed")
	}
}

// ===========================================================================
// Opportunity endpoints
// ===========================================================================

// ListOpenOpportunities GET /marketplace/opportunities?type=rotation&cursor=&limit=
// Keyset paginated: next_cursor + has_more returned in envelope.
func (h *MarketplaceHandler) ListOpenOpportunities(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	cursor, ok := ParseCursorQuery(w, r)
	if !ok {
		return
	}
	limit := ParseLimit(r, 50, 200)
	oppType := strings.TrimSpace(r.URL.Query().Get("type"))
	p := repository.KeysetPage{Limit: limit}
	if cursor != nil {
		ts := cursor.CreatedAt
		id := cursor.ID
		p.CursorCreatedAt = &ts
		p.CursorID = &id
	}
	out, err := h.repo.ListOpenPaged(r.Context(), t, oppType, p)
	if err != nil {
		h.logger.Error().Err(err).Msg("list opportunities")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "ilanlar okunamadı")
		return
	}
	resp := map[string]any{"items": out}
	if len(out) > 0 {
		last := out[len(out)-1]
		resp["next_cursor"] = EncodeCursor(last.PostedAt, last.ID)
		resp["has_more"] = len(out) == limit
	} else {
		resp["next_cursor"] = ""
		resp["has_more"] = false
	}
	WriteJSON(w, http.StatusOK, resp)
}

// CreateOpportunity POST /marketplace/opportunities
func (h *MarketplaceHandler) CreateOpportunity(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	if !isHRRole(middleware.Role(r.Context())) {
		WriteErr(w, http.StatusForbidden, "forbidden", "İK rolü gerekli")
		return
	}
	var body repository.InternalOpportunity
	if !DecodeJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		WriteErr(w, http.StatusBadRequest, "validation_failed", "title zorunlu")
		return
	}
	body.ID = uuid.New()
	body.TenantID = t
	if body.Status == "" {
		body.Status = "open"
	}
	if body.OpportunityType == "" {
		body.OpportunityType = "permanent"
	}
	if body.PostedBy == uuid.Nil {
		if uid, ok := middleware.UserID(r.Context()); ok {
			body.PostedBy = uid
		}
	}
	if err := h.repo.CreateOpportunity(r.Context(), &body); err != nil {
		h.logger.Error().Err(err).Msg("create opportunity")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "ilan oluşturulamadı")
		return
	}
	uid, _ := middleware.UserID(r.Context())
	h.writeAudit(r, t, uid, "mobility.opportunity.created", "internal_opportunity", body.ID, map[string]any{
		"title": body.Title, "opportunity_type": body.OpportunityType,
	})
	WriteJSON(w, http.StatusCreated, body)
}

// GetOpportunity GET /marketplace/opportunities/{id}
func (h *MarketplaceHandler) GetOpportunity(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	out, err := h.repo.GetOpportunity(r.Context(), t, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			WriteErr(w, http.StatusNotFound, "not_found", "ilan bulunamadı")
			return
		}
		h.logger.Error().Err(err).Msg("get opportunity")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "ilan okunamadı")
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// UpdateStatus PATCH /marketplace/opportunities/{id}/status
func (h *MarketplaceHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	if !isHRRole(middleware.Role(r.Context())) {
		WriteErr(w, http.StatusForbidden, "forbidden", "İK rolü gerekli")
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	if err := h.repo.UpdateOpportunityStatus(r.Context(), t, id, body.Status); err != nil {
		h.logger.Error().Err(err).Msg("update opportunity status")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "durum güncellenemedi")
		return
	}
	uid, _ := middleware.UserID(r.Context())
	h.writeAudit(r, t, uid, "mobility.opportunity.status_changed", "internal_opportunity", id, map[string]any{
		"status": body.Status,
	})
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

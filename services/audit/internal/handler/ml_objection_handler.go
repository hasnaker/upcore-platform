package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/service"
)

// clientIP shared with consent_handler.go (same package).

// reviewerContext collects the HTTP-scoped audit fields needed by
// MLObjectionService.Uphold / Dismiss.
func reviewerContext(r *http.Request) service.ReviewerContext {
	userID := middleware.UserIDFromContext(r.Context())
	role := middleware.RoleFromContext(r.Context())
	roles := []string{}
	if role != "" {
		roles = append(roles, role)
	}
	// Accept a comma-separated X-User-Roles header for services that assign
	// multiple roles (dpo + platform-admin).
	if extra := r.Header.Get("X-User-Roles"); extra != "" {
		for _, rr := range strings.Split(extra, ",") {
			rr = strings.TrimSpace(rr)
			if rr != "" {
				roles = append(roles, rr)
			}
		}
	}
	ua := strings.TrimSpace(r.Header.Get("User-Agent"))
	ip := clientIP(r)
	return service.ReviewerContext{
		ReviewerUserID: userID,
		Roles:          roles,
		IP:             ip,
		UserAgent:      ua,
	}
}

// MLObjectionHandler exposes HTTP endpoints for the KVKK Madde 22 review queue.
type MLObjectionHandler struct {
	svc *service.MLObjectionService
}

// NewMLObjectionHandler builds a handler for the ML objection review queue.
func NewMLObjectionHandler(svc *service.MLObjectionService) *MLObjectionHandler {
	return &MLObjectionHandler{svc: svc}
}

type createMLObjectionRequest struct {
	UserID       uuid.UUID `json:"user_id"`
	PredictionID uuid.UUID `json:"prediction_id"`
	Reason       string    `json:"reason"`
	ContactEmail string    `json:"contact_email"`
}

// Create handles POST /api/v1/audit/ml-objections (internal fan-in from the
// ML service). The public-facing objection endpoint lives in the ML service;
// it calls this endpoint to land the record in the review queue.
func (h *MLObjectionHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}
	var req createMLObjectionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	o := &domain.MLObjection{
		TenantID:     tenantID,
		UserID:       req.UserID,
		PredictionID: req.PredictionID,
		Reason:       req.Reason,
		ContactEmail: req.ContactEmail,
	}
	result, err := h.svc.Receive(r.Context(), o)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{
		"objection_id": result.ID,
		"due_date":     result.DueDate(),
	})
}

// List handles GET /api/v1/audit/ml-objections.
func (h *MLObjectionHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	q := r.URL.Query()
	filter := domain.MLObjectionFilter{
		TenantID: tenantID,
		Status:   q.Get("status"),
		Overdue:  q.Get("overdue") == "true",
		Page:     ParseIntQuery(r, "page", 1),
		Limit:    ParseIntQuery(r, "limit", 20),
	}
	if raw := q.Get("user_id"); raw != "" {
		if u, err := uuid.Parse(raw); err == nil {
			filter.UserID = u
		}
	}
	items, total, err := h.svc.List(r.Context(), filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

// GetByID handles GET /api/v1/audit/ml-objections/{id}.
func (h *MLObjectionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.svc.GetByID(r.Context(), tenantID, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// Verify handles POST /api/v1/audit/ml-objections/{id}/verify.
func (h *MLObjectionHandler) Verify(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Verify(r.Context(), tenantID, id, userID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "verifying"})
}

// Process handles POST /api/v1/audit/ml-objections/{id}/process.
func (h *MLObjectionHandler) Process(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Process(r.Context(), tenantID, id, userID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "in_progress"})
}

// Complete handles POST /api/v1/audit/ml-objections/{id}/complete.
func (h *MLObjectionHandler) Complete(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		ResolutionNote string `json:"resolution_note"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.svc.Complete(r.Context(), tenantID, id, userID, body.ResolutionNote); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "completed"})
}

// Reject handles POST /api/v1/audit/ml-objections/{id}/reject.
func (h *MLObjectionHandler) Reject(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if body.Reason == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "reason required"})
		return
	}
	if err := h.svc.Reject(r.Context(), tenantID, id, userID, body.Reason); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

// Uphold handles POST /api/v1/audit/ml-objections/{id}/uphold.
// KVKK Madde 22 — itiraz haklı kararı: tahmin retract, ilgili müdahaleler
// ml.prediction.retracted.v1 subscriber'ları tarafından kaldırılır.
func (h *MLObjectionHandler) Uphold(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		ResolutionNote string `json:"resolution_note"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	updated, err := h.svc.Uphold(r.Context(), tenantID, id, reviewerContext(r), body.ResolutionNote)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, updated)
}

// Dismiss handles POST /api/v1/audit/ml-objections/{id}/dismiss.
// Requires the reviewer to carry a DPO / platform-admin role (the service
// layer enforces this; the DB trigger validates dpo_user_id + dpo_signed_at).
func (h *MLObjectionHandler) Dismiss(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		RejectionReason string     `json:"rejection_reason"`
		DPOUserID       *uuid.UUID `json:"dpo_user_id,omitempty"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	rc := reviewerContext(r)
	if body.DPOUserID != nil {
		rc.DPOUserID = *body.DPOUserID
	}
	updated, err := h.svc.Dismiss(r.Context(), tenantID, id, rc, body.RejectionReason)
	if err != nil {
		if isForbidden(err) {
			WriteJSON(w, http.StatusForbidden, ErrorResponse{
				Error:   "forbidden",
				Message: "İtirazı reddetmek için DPO veya platform-admin rolü gerekli.",
			})
			return
		}
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, updated)
}

// isForbidden reports whether err wraps domain.ErrForbidden.
func isForbidden(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, domain.ErrForbidden) {
		return true
	}
	return strings.Contains(err.Error(), "forbidden")
}

// ListOverdue handles GET /api/v1/audit/ml-objections/overdue.
func (h *MLObjectionHandler) ListOverdue(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	items, err := h.svc.GetOverdue(r.Context(), tenantID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

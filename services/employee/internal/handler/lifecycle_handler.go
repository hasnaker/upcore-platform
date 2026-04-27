package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// ============================================================================
// Career Handler
// ============================================================================

// CareerHandler exposes career-event HTTP endpoints.
type CareerHandler struct{ svc *service.CareerService }

// NewCareerHandler constructs the handler.
func NewCareerHandler(svc *service.CareerService) *CareerHandler { return &CareerHandler{svc: svc} }

// Timeline handles GET /employees/{id}/career.
func (h *CareerHandler) Timeline(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 100)
	items, total, err := h.svc.Timeline(r.Context(), tid, empID, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total, "page": page, "limit": limit})
}

// Append handles POST /employees/{id}/career.
func (h *CareerHandler) Append(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.CareerEventRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	e, err := h.svc.Append(r.Context(), tid, empID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, e)
}

// ============================================================================
// Compensation Handler (role-gated)
// ============================================================================

// CompensationHandler exposes compensation-record endpoints.
type CompensationHandler struct{ svc *service.CompensationService }

// NewCompensationHandler constructs the handler.
func NewCompensationHandler(svc *service.CompensationService) *CompensationHandler {
	return &CompensationHandler{svc: svc}
}

// History handles GET /employees/{id}/compensation.
func (h *CompensationHandler) History(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	role := middleware.RoleFromContext(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 100)
	items, total, err := h.svc.History(r.Context(), tid, empID, role, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total, "page": page, "limit": limit})
}

// Create handles POST /employees/{id}/compensation.
func (h *CompensationHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	role := middleware.RoleFromContext(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.CompensationRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.Create(r.Context(), tid, empID, role, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, c)
}

// ============================================================================
// Related Contact Handler
// ============================================================================

// RelatedContactHandler exposes related_contacts endpoints.
type RelatedContactHandler struct{ svc *service.RelatedContactService }

// NewRelatedContactHandler constructs the handler.
func NewRelatedContactHandler(svc *service.RelatedContactService) *RelatedContactHandler {
	return &RelatedContactHandler{svc: svc}
}

// List handles GET /employees/{id}/related-contacts.
func (h *RelatedContactHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	items, err := h.svc.List(r.Context(), tid, empID, r.URL.Query().Get("kind"))
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Create handles POST /employees/{id}/related-contacts.
func (h *RelatedContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.RelatedContactRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.Create(r.Context(), tid, empID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, c)
}

// Patch handles PATCH /related-contacts/{id}.
func (h *RelatedContactHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.RelatedContactRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// Delete handles DELETE /related-contacts/{id}.
func (h *RelatedContactHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ============================================================================
// Employee Position Handler
// ============================================================================

// PositionHandler exposes multi-FTE employee_positions endpoints.
type PositionHandler struct{ svc *service.PositionService }

// NewPositionHandler constructs the handler.
func NewPositionHandler(svc *service.PositionService) *PositionHandler {
	return &PositionHandler{svc: svc}
}

// List handles GET /employees/{id}/positions.
func (h *PositionHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	activeOnly := r.URL.Query().Get("active") == "true"
	items, err := h.svc.List(r.Context(), tid, empID, activeOnly)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Create handles POST /employees/{id}/positions.
func (h *PositionHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.PositionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	p, err := h.svc.Create(r.Context(), tid, empID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, p)
}

// Patch handles PATCH /employee-positions/{id}.
func (h *PositionHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.PositionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	p, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// End handles POST /employee-positions/{id}/end.
func (h *PositionHandler) End(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.End(r.Context(), tid, id, time.Now().UTC()); err != nil {
		WriteError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ============================================================================
// Offboarding Handler
// ============================================================================

// OffboardingHandler exposes offboarding_events + exit_interviews endpoints.
type OffboardingHandler struct{ svc *service.OffboardingService }

// NewOffboardingHandler constructs the handler.
func NewOffboardingHandler(svc *service.OffboardingService) *OffboardingHandler {
	return &OffboardingHandler{svc: svc}
}

// Start handles POST /employees/{id}/offboarding.
func (h *OffboardingHandler) Start(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.OffboardingRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	o, err := h.svc.Start(r.Context(), tid, empID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, o)
}

// GetForEmployee handles GET /employees/{id}/offboarding.
func (h *OffboardingHandler) GetForEmployee(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.svc.GetForEmployee(r.Context(), tid, empID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// Get handles GET /offboarding/{id}.
func (h *OffboardingHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// Patch handles PATCH /offboarding/{id}.
func (h *OffboardingHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.OffboardingRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	o, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// SubmitExitInterview handles POST /offboarding/{id}/exit-interview.
func (h *OffboardingHandler) SubmitExitInterview(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.ExitInterviewRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	i, err := h.svc.SubmitExitInterview(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, i)
}

// GetExitInterview handles GET /offboarding/{id}/exit-interview.
func (h *OffboardingHandler) GetExitInterview(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	i, err := h.svc.GetExitInterview(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, i)
}

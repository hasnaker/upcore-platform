package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/repository"
	"github.com/upcore/ats/internal/service"
)

// RequisitionHandler exposes requisition endpoints.
type RequisitionHandler struct {
	svc *service.RequisitionService
	dep Dependencies
}

// NewRequisitionHandler constructs a RequisitionHandler.
func NewRequisitionHandler(svc *service.RequisitionService, dep Dependencies) *RequisitionHandler {
	return &RequisitionHandler{svc: svc, dep: dep}
}

// List handles GET /api/v1/ats/requisitions.
func (h *RequisitionHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	f := repository.RequisitionFilter{
		TenantID:        tid,
		Status:          r.URL.Query().Get("status"),
		HiringManagerID: ParseUUIDQuery(r, "hiring_manager_id"),
		Search:          r.URL.Query().Get("q"),
		Page:            ParseIntQuery(r, "page", 1),
		Limit:           ParseIntQuery(r, "limit", 50),
	}
	items, total, err := h.svc.List(r.Context(), f)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  f.Page,
		"limit": f.Limit,
	})
}

// Create handles POST /api/v1/ats/requisitions.
func (h *RequisitionHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.CreateRequisitionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Create(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, result)
}

// Get handles GET /api/v1/ats/requisitions/{id}.
func (h *RequisitionHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Patch handles PATCH /api/v1/ats/requisitions/{id}.
func (h *RequisitionHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.UpdateRequisitionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Open handles POST /api/v1/ats/requisitions/{id}/open.
func (h *RequisitionHandler) Open(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Open(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Hold handles POST /api/v1/ats/requisitions/{id}/hold.
func (h *RequisitionHandler) Hold(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Hold(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Close handles POST /api/v1/ats/requisitions/{id}/close.
func (h *RequisitionHandler) Close(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.CloseRequisitionRequest
	_ = DecodeJSON(r, &req) // Body is optional.
	result, err := h.svc.Close(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/service"
)

// TenantHandler exposes tenant CRUD endpoints.
type TenantHandler struct {
	svc *service.TenantService
	dep Dependencies
}

// NewTenantHandler constructs TenantHandler.
func NewTenantHandler(svc *service.TenantService, dep Dependencies) *TenantHandler {
	return &TenantHandler{svc: svc, dep: dep}
}

// Get handles GET /tenants/{id}.
func (h *TenantHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	t, err := h.svc.Get(r.Context(), id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, t)
}

// GetCurrent handles GET /tenants/me (tenant from context).
func (h *TenantHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	t, err := h.svc.Get(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, t)
}

// Patch handles PATCH /tenants/{id}.
func (h *TenantHandler) Patch(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var in service.UpdateTenantInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	t, err := h.svc.Update(r.Context(), id, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, t)
}

// Delete handles DELETE /tenants/{id}.
func (h *TenantHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]string{"status": "scheduled_for_deletion"})
}

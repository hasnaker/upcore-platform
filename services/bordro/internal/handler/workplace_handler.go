package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/domain"
	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/service"
)

// WorkplaceHandler exposes the tenant's SGK işyeri configuration.
type WorkplaceHandler struct{ svc *service.WorkplaceService }

// NewWorkplaceHandler constructs the handler.
func NewWorkplaceHandler(svc *service.WorkplaceService) *WorkplaceHandler {
	return &WorkplaceHandler{svc: svc}
}

// Get handles GET /workplace.
func (h *WorkplaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	wp, err := h.svc.Get(r.Context(), tid)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			WriteJSON(w, http.StatusNotFound, ErrorResponse{
				Error: "workplace_not_configured",
				Message: "Bu tenant için SGK işyeri tanımı yok. Önce PUT /api/v1/bordro/workplace çağırın.",
			})
			return
		}
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, wp)
}

// Upsert handles PUT /workplace.
func (h *WorkplaceHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.WorkplaceRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	wp, err := h.svc.Upsert(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, wp)
}

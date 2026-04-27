package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/service"
)

// SettingsHandler exposes the tenant bordro-level configuration.
type SettingsHandler struct{ svc *service.SettingsService }

// NewSettingsHandler constructs the handler.
func NewSettingsHandler(svc *service.SettingsService) *SettingsHandler {
	return &SettingsHandler{svc: svc}
}

// Get handles GET /settings.
func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	s, err := h.svc.Get(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, s)
}

// Upsert handles PUT /settings.
func (h *SettingsHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.SettingsRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	s, err := h.svc.Upsert(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, s)
}

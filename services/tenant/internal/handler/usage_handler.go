package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/service"
)

// UsageHandler exposes usage-tracking endpoints.
type UsageHandler struct {
	svc *service.UsageService
	dep Dependencies
}

// NewUsageHandler constructs a UsageHandler.
func NewUsageHandler(svc *service.UsageService, dep Dependencies) *UsageHandler {
	return &UsageHandler{svc: svc, dep: dep}
}

// GetCurrent handles GET /usage.
func (h *UsageHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	m, err := h.svc.CurrentUsage(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, m)
}

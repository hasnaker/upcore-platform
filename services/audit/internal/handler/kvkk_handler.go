package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/service"
)

// KVKKHandler exposes HTTP endpoints for KVKK compliance operations.
type KVKKHandler struct {
	svc *service.KVKKService
}

// NewKVKKHandler constructs a KVKKHandler.
func NewKVKKHandler(svc *service.KVKKService) *KVKKHandler {
	return &KVKKHandler{svc: svc}
}

// LogAccess handles POST /api/v1/audit/kvkk/access-log.
func (h *KVKKHandler) LogAccess(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	role := middleware.RoleFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	var req service.LogAccessRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	ipAddress := r.RemoteAddr
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		ipAddress = fwd
	}

	if err := h.svc.LogAccess(r.Context(), tenantID, userID, role, ipAddress, &req); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"status": "logged"})
}

// GetSubjectHistory handles GET /api/v1/audit/kvkk/subject/{subjectId}/history.
func (h *KVKKHandler) GetSubjectHistory(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	subjectID, ok := ParseUUID(w, chi.URLParam(r, "subjectId"))
	if !ok {
		return
	}

	logs, err := h.svc.GetSubjectAccessHistory(r.Context(), tenantID, subjectID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, logs)
}

// GetProcessingRegister handles GET /api/v1/audit/kvkk/processing-register.
func (h *KVKKHandler) GetProcessingRegister(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	register, err := h.svc.GetProcessingRegister(r.Context(), tenantID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, register)
}

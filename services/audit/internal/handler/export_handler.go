package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/service"
)

// ExportHandler exposes HTTP endpoints for audit log exports.
type ExportHandler struct {
	svc *service.ExportService
}

// NewExportHandler constructs an ExportHandler.
func NewExportHandler(svc *service.ExportService) *ExportHandler {
	return &ExportHandler{svc: svc}
}

// Create handles POST /api/v1/audit/exports.
func (h *ExportHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	var req domain.ExportRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	export, err := h.svc.CreateExport(r.Context(), tenantID, userID, &req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{"export_id": export.ID})
}

// GetByID handles GET /api/v1/audit/exports/{id}.
func (h *ExportHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	export, err := h.svc.Get(r.Context(), tenantID, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, export)
}

// List handles GET /api/v1/audit/exports.
func (h *ExportHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	page := ParseIntQuery(r, "page", 1)
	limit := ParseIntQuery(r, "limit", 20)

	items, total, err := h.svc.List(r.Context(), tenantID, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

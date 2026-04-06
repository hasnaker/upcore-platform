package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/service"
)

// DSRHandler exposes HTTP endpoints for KVKK data subject rights requests.
type DSRHandler struct {
	svc *service.DSRService
}

// NewDSRHandler constructs a DSRHandler.
func NewDSRHandler(svc *service.DSRService) *DSRHandler {
	return &DSRHandler{svc: svc}
}

// CreateRequest handles POST /api/v1/audit/kvkk/dsr.
func (h *DSRHandler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	var req domain.ReceiveDSRRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	dsr, err := h.svc.Receive(r.Context(), tenantID, &req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{
		"request_id": dsr.ID,
		"due_date":   dsr.DueDate(),
	})
}

// List handles GET /api/v1/audit/kvkk/dsr.
func (h *DSRHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	q := r.URL.Query()

	filter := domain.DSRFilter{
		TenantID:    tenantID,
		Status:      q.Get("status"),
		RequestType: q.Get("request_type"),
		Overdue:     q.Get("overdue") == "true",
		Page:        ParseIntQuery(r, "page", 1),
		Limit:       ParseIntQuery(r, "limit", 20),
	}

	items, total, err := h.svc.List(r.Context(), filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

// GetByID handles GET /api/v1/audit/kvkk/dsr/{id}.
func (h *DSRHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	dsr, err := h.svc.GetByID(r.Context(), tenantID, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, dsr)
}

// Verify handles POST /api/v1/audit/kvkk/dsr/{id}/verify.
func (h *DSRHandler) Verify(w http.ResponseWriter, r *http.Request) {
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
	WriteJSON(w, http.StatusOK, map[string]string{"status": "verified"})
}

// Process handles POST /api/v1/audit/kvkk/dsr/{id}/process.
func (h *DSRHandler) Process(w http.ResponseWriter, r *http.Request) {
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

// Complete handles POST /api/v1/audit/kvkk/dsr/{id}/complete.
func (h *DSRHandler) Complete(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	var body struct {
		ResponseDataURL string `json:"response_data_url"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	if err := h.svc.Complete(r.Context(), tenantID, id, userID, body.ResponseDataURL); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "completed"})
}

// Reject handles POST /api/v1/audit/kvkk/dsr/{id}/reject.
func (h *DSRHandler) Reject(w http.ResponseWriter, r *http.Request) {
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

// GetOverdue handles GET /api/v1/audit/kvkk/dsr?overdue=true (convenience method).
func (h *DSRHandler) GetOverdue(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())

	items, err := h.svc.GetOverdueRequests(r.Context(), tenantID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

// GenerateAccessPackage handles POST /api/v1/audit/kvkk/dsr/{id}/generate-access-package.
func (h *DSRHandler) GenerateAccessPackage(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	url, err := h.svc.GenerateAccessPackage(r.Context(), tenantID, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{
		"job_started_at":       r.Context().Value("request_time"),
		"estimated_completion": "5 minutes",
		"package_url":          url,
	})
}

// ExecuteErasure handles POST /api/v1/audit/kvkk/dsr/{id}/execute-erasure.
func (h *DSRHandler) ExecuteErasure(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	if err := h.svc.ExecuteErasure(r.Context(), tenantID, id, userID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]string{"status": "erasure_initiated"})
}

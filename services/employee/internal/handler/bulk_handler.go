package handler

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// BulkHandler exposes bulk operations over employees: status change, mass email.
type BulkHandler struct {
	svc *service.EmployeeService
}

// NewBulkHandler constructs the handler.
func NewBulkHandler(svc *service.EmployeeService) *BulkHandler { return &BulkHandler{svc: svc} }

// BulkStatusRequest changes `employment_status` for a list of employee IDs.
type BulkStatusRequest struct {
	EmployeeIDs []uuid.UUID `json:"employee_ids"`
	Status      string      `json:"status"` // active|inactive|on_leave|terminated
}

// BulkStatus handles POST /employees/bulk-status.
// Applies the new status to N employees in a single tx. Returns per-id result.
func (h *BulkHandler) BulkStatus(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req BulkStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if len(req.EmployeeIDs) == 0 || req.Status == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{
			Error: "invalid", Message: "employee_ids + status zorunlu",
		})
		return
	}
	if len(req.EmployeeIDs) > 500 {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error: "too_many", Message: "max 500 çalışan tek partide",
		})
		return
	}
	results := make(map[string]string, len(req.EmployeeIDs))
	for _, eid := range req.EmployeeIDs {
		if err := h.svc.UpdateStatus(r.Context(), tid, eid, req.Status); err != nil {
			results[eid.String()] = "error: " + err.Error()
			continue
		}
		results[eid.String()] = "ok"
	}
	WriteJSON(w, http.StatusOK, map[string]any{"results": results, "count": len(req.EmployeeIDs)})
}

// MassEmailRequest broadcasts a templated email to a filtered audience.
type MassEmailRequest struct {
	AudienceFilter struct {
		Status       string      `json:"status,omitempty"`
		DepartmentID *uuid.UUID  `json:"department_id,omitempty"`
		EmployeeIDs  []uuid.UUID `json:"employee_ids,omitempty"`
	} `json:"audience_filter"`
	TemplateKey string            `json:"template_key"` // notification_templates key
	Variables   map[string]string `json:"variables"`
}

// MassEmail handles POST /employees/mass-email.
// Gelir bir event publisher'a "email.mass.dispatch.v1" event'i yayınlar;
// notification service gerçek gönderimi yapar (bu handler orchestrator rolünde).
func (h *BulkHandler) MassEmail(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req MassEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	if req.TemplateKey == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "template_required"})
		return
	}
	count, err := h.svc.MassEmail(r.Context(), tid, service.MassEmailParams{
		Status:       req.AudienceFilter.Status,
		DepartmentID: req.AudienceFilter.DepartmentID,
		EmployeeIDs:  req.AudienceFilter.EmployeeIDs,
		TemplateKey:  req.TemplateKey,
		Variables:    req.Variables,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"ok":              true,
		"recipient_count": count,
		"message":         "Mass email dispatch event'i yayınlandı; notification service gönderecek",
	})
}

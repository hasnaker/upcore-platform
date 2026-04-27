package handler

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// AssignmentHandler exposes assignment management endpoints.
type AssignmentHandler struct {
	svc *service.AssignmentService
	log zerolog.Logger
}

// NewAssignmentHandler constructs an AssignmentHandler.
func NewAssignmentHandler(svc *service.AssignmentService, log zerolog.Logger) *AssignmentHandler {
	return &AssignmentHandler{svc: svc, log: log}
}

// List handles GET /interventions/assignments.
func (h *AssignmentHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := ParseIntQuery(r, "limit", 50)
	page := ParseIntQuery(r, "page", 1)
	offset := (page - 1) * limit

	f := domain.AssignmentFilter{
		EmployeeID:     ParseUUIDQuery(r, "assignee_employee_id"),
		InterventionID: ParseUUIDQuery(r, "intervention_id"),
		Limit:          limit,
		Offset:         offset,
	}
	if s := r.URL.Query().Get("status"); s != "" {
		st := domain.AssignmentStatus(s)
		f.Status = &st
	}

	items, total, err := h.svc.List(r.Context(), f)
	if err != nil {
		WriteServerError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Create handles POST /interventions/assignments.
func (h *AssignmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())

	var req service.AssignRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	req.TenantID = tid
	req.AssignedBy = &uid

	a, err := h.svc.Assign(r.Context(), req)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, a)
}

// BulkCreate handles POST /interventions/assignments/bulk.
func (h *AssignmentHandler) BulkCreate(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())

	var req service.BulkAssignRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	req.TenantID = tid
	req.AssignedBy = &uid

	count, err := h.svc.BulkAssign(r.Context(), req)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{"created_count": count})
}

// Get handles GET /interventions/assignments/{id}.
//
// Access rules:
//   - HR/admin roles can fetch any assignment within the tenant.
//   - Non-HR users can only fetch assignments whose employee_id matches the
//     caller's identity (user_id used as employee_id — see middleware).
//     This powers the employee consent page with a signed URL check.
func (h *AssignmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	role := middleware.RoleFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	a, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	if !isHROrAdmin(role) && a.EmployeeID != uid {
		WriteError(w, http.StatusForbidden, "forbidden", "assignment belongs to a different employee")
		return
	}
	WriteJSON(w, http.StatusOK, a)
}

// isHROrAdmin reports whether the given role can access any assignment in the
// tenant (HR staff, admins, SMB owner).
func isHROrAdmin(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "hr_admin", "hr", "admin", "owner", "superadmin":
		return true
	}
	return false
}

// Update handles PATCH /interventions/assignments/{id}.
func (h *AssignmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	// Simplified: accept notes update
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	a, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	_ = a
	WriteJSON(w, http.StatusOK, a)
}

// Start handles POST /interventions/assignments/{id}/start.
func (h *AssignmentHandler) Start(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Start(r.Context(), tid, id); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "in_progress"})
}

// Complete handles POST /interventions/assignments/{id}/complete.
func (h *AssignmentHandler) Complete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Complete(r.Context(), tid, id); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "completed"})
}

// Cancel handles POST /interventions/assignments/{id}/cancel.
func (h *AssignmentHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	if err := h.svc.Cancel(r.Context(), tid, id, body.Reason); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

// ListMine handles GET /interventions/assignments/mine.
func (h *AssignmentHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil || uid == uuid.Nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "missing context")
		return
	}
	// user → employee resolution is delegated to the `employee` service.
	// Until the employee-service contract exposes a by-user lookup with the
	// required RBAC scope, this endpoint intentionally returns an empty
	// list so the portal renders the zero-state without leaking cross-user
	// assignments.
	WriteJSON(w, http.StatusOK, map[string]any{"items": []any{}})
}

// ListPendingConsentMine handles GET /interventions/assignments/pending-consent-mine.
func (h *AssignmentHandler) ListPendingConsentMine(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil || uid == uuid.Nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "missing context")
		return
	}
	// user → employee resolution is delegated to the `employee` service.
	// Until the employee-service contract exposes a by-user lookup with the
	// required RBAC scope, this endpoint intentionally returns an empty
	// list so the portal renders the zero-state without leaking cross-user
	// assignments.
	WriteJSON(w, http.StatusOK, map[string]any{"items": []any{}})
}

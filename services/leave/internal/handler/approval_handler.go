package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/middleware"
	"github.com/upcore/leave/internal/service"
)

// ApprovalHandler serves approve/reject endpoints.
type ApprovalHandler struct {
	svc *service.ApprovalService
	dep Dependencies
}

// NewApprovalHandler constructs an ApprovalHandler.
func NewApprovalHandler(svc *service.ApprovalService, dep Dependencies) *ApprovalHandler {
	return &ApprovalHandler{svc: svc, dep: dep}
}

type approveBody struct {
	Comment *string `json:"comment,omitempty"`
}

type rejectBody struct {
	Reason string `json:"reason" validate:"required,min=3,max=500"`
}

// Approve handles POST /leaves/requests/{id}/approve.
func (h *ApprovalHandler) Approve(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	empID := middleware.EmployeeIDFromContext(r.Context())
	role := domain.ParseApproverRole(middleware.RoleFromContext(r.Context()))

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var body approveBody
	_ = DecodeJSON(r, &body)

	req, err := h.svc.Approve(r.Context(), tid, id, uid, empID, role)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, req)
}

// Reject handles POST /leaves/requests/{id}/reject.
func (h *ApprovalHandler) Reject(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	empID := middleware.EmployeeIDFromContext(r.Context())
	role := domain.ParseApproverRole(middleware.RoleFromContext(r.Context()))

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var body rejectBody
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(body); err != nil {
		WriteError(w, err)
		return
	}
	req, err := h.svc.Reject(r.Context(), tid, id, uid, empID, role, body.Reason)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, req)
}

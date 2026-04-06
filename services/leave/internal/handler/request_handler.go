package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/middleware"
	"github.com/upcore/leave/internal/service"
)

// RequestHandler serves leave-request endpoints.
type RequestHandler struct {
	svc *service.LeaveService
	dep Dependencies
}

// NewRequestHandler constructs a RequestHandler.
func NewRequestHandler(svc *service.LeaveService, dep Dependencies) *RequestHandler {
	return &RequestHandler{svc: svc, dep: dep}
}

// submitRequestBody is the wire DTO for POST /leaves/requests.
type submitRequestBody struct {
	EmployeeID   string   `json:"employee_id"`
	LeaveTypeID  string   `json:"leave_type_id" validate:"required"`
	StartDate    string   `json:"start_date" validate:"required"`
	EndDate      string   `json:"end_date" validate:"required"`
	StartHalfDay bool     `json:"start_half_day"`
	EndHalfDay   bool     `json:"end_half_day"`
	Reason       *string  `json:"reason,omitempty"`
	DocumentURLs []string `json:"document_urls,omitempty"`
	AsDraft      bool     `json:"as_draft,omitempty"`
}

// Create handles POST /leaves/requests.
func (h *RequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	var in submitRequestBody
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	tid := middleware.TenantIDFromContext(r.Context())
	empID := middleware.EmployeeIDFromContext(r.Context())
	if in.EmployeeID != "" {
		// allow HR/manager to submit on behalf — parse if provided
		if id, err := uuid.Parse(in.EmployeeID); err == nil {
			empID = id
		}
	}
	if empID == uuid.Nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: "employee_id required"})
		return
	}
	ltID, err := uuid.Parse(in.LeaveTypeID)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid leave_type_id"})
		return
	}
	start, err := time.Parse("2006-01-02", in.StartDate)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid start_date (YYYY-MM-DD)"})
		return
	}
	end, err := time.Parse("2006-01-02", in.EndDate)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid end_date (YYYY-MM-DD)"})
		return
	}
	req, err := h.svc.Submit(r.Context(), tid, service.SubmitInput{
		EmployeeID: empID, LeaveTypeID: ltID,
		StartDate: start, EndDate: end,
		StartHalfDay: in.StartHalfDay, EndHalfDay: in.EndHalfDay,
		Reason: in.Reason, DocumentURLs: in.DocumentURLs, AsDraft: in.AsDraft,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, req)
}

// Get handles GET /leaves/requests/{id}.
func (h *RequestHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	req, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, req)
}

// List handles GET /leaves/requests.
func (h *RequestHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	limit, offset := parsePage(r)

	status := r.URL.Query().Get("status")
	empStr := r.URL.Query().Get("employee_id")

	if status != "" {
		items, err := h.svc.ListByStatus(r.Context(), tid, domain.LeaveStatus(status), limit, offset)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
		return
	}
	empID := middleware.EmployeeIDFromContext(r.Context())
	if empStr != "" {
		if id, err := uuid.Parse(empStr); err == nil {
			empID = id
		}
	}
	if empID == uuid.Nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: "employee_id required"})
		return
	}
	items, err := h.svc.List(r.Context(), tid, empID, limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

// updateBody is the wire DTO for PATCH.
type updateBody struct {
	StartDate    *string  `json:"start_date,omitempty"`
	EndDate      *string  `json:"end_date,omitempty"`
	StartHalfDay *bool    `json:"start_half_day,omitempty"`
	EndHalfDay   *bool    `json:"end_half_day,omitempty"`
	Reason       *string  `json:"reason,omitempty"`
	DocumentURLs []string `json:"document_urls,omitempty"`
	LeaveTypeID  *string  `json:"leave_type_id,omitempty"`
}

// Patch handles PATCH /leaves/requests/{id}.
func (h *RequestHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var body updateBody
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	in := service.UpdateInput{
		StartHalfDay: body.StartHalfDay,
		EndHalfDay:   body.EndHalfDay,
		Reason:       body.Reason,
		DocumentURLs: body.DocumentURLs,
	}
	if body.StartDate != nil {
		t, err := time.Parse("2006-01-02", *body.StartDate)
		if err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid start_date"})
			return
		}
		in.StartDate = &t
	}
	if body.EndDate != nil {
		t, err := time.Parse("2006-01-02", *body.EndDate)
		if err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid end_date"})
			return
		}
		in.EndDate = &t
	}
	if body.LeaveTypeID != nil {
		ltID, err := uuid.Parse(*body.LeaveTypeID)
		if err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid leave_type_id"})
			return
		}
		in.LeaveTypeID = &ltID
	}
	req, err := h.svc.Update(r.Context(), tid, id, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, req)
}

// Delete handles DELETE /leaves/requests/{id}.
func (h *RequestHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	// Soft cancel when not draft; delete when draft
	if err := h.svc.Cancel(r.Context(), tid, id, uid); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func parsePage(r *http.Request) (limit, offset int) {
	limit = 50
	if s := r.URL.Query().Get("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	if s := r.URL.Query().Get("offset"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n >= 0 {
			offset = n
		}
	}
	return
}

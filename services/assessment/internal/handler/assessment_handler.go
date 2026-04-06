package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/assessment/internal/middleware"
	"github.com/upcore/assessment/internal/repository"
	"github.com/upcore/assessment/internal/service"
)

// AssessmentHandler exposes assessment CRUD and session endpoints.
type AssessmentHandler struct {
	svc      *service.AssessmentService
	log      zerolog.Logger
	validate *validator.Validate
}

// NewAssessmentHandler constructs an AssessmentHandler.
func NewAssessmentHandler(svc *service.AssessmentService, log zerolog.Logger, validate *validator.Validate) *AssessmentHandler {
	return &AssessmentHandler{svc: svc, log: log, validate: validate}
}

// Create handles POST /assessments.
func (h *AssessmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.CreateAssessmentRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.validate.Struct(req); err != nil {
		WriteError(w, err)
		return
	}
	a, err := h.svc.Create(r.Context(), tid, uid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, a)
}

// Get handles GET /assessments/{id}.
func (h *AssessmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	a, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, a)
}

// List handles GET /assessments.
func (h *AssessmentHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	f := repository.ListFilter{
		TenantID:       tid,
		InstrumentCode: r.URL.Query().Get("instrument_code"),
		Status:         r.URL.Query().Get("status"),
		Page:           ParseIntQuery(r, "page", 1),
		Limit:          ParseIntQuery(r, "limit", 50),
		SortBy:         r.URL.Query().Get("sort_by"),
		SortDir:        r.URL.Query().Get("sort_dir"),
	}
	if empID := r.URL.Query().Get("employee_id"); empID != "" {
		if uid, err := uuid.Parse(empID); err == nil {
			f.EmployeeID = &uid
		}
	}
	items, total, err := h.svc.List(r.Context(), f)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  f.Page,
		"limit": f.Limit,
	})
}

// ResumeSession handles GET /assessments/{id}/sessions/{sid}.
func (h *AssessmentHandler) ResumeSession(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	sid, ok := ParseUUID(w, chi.URLParam(r, "sid"))
	if !ok {
		return
	}
	session, err := h.svc.ResumeSession(r.Context(), id, sid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, session)
}

// TriggerReport handles POST /assessments/{id}/report.
func (h *AssessmentHandler) TriggerReport(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.TriggerReport(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]string{"status": "report_requested"})
}

// StartSession handles POST /assessments/{id}/sessions.
func (h *AssessmentHandler) StartSession(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.StartSessionRequest
	if err := DecodeJSON(r, &req); err != nil {
		// Allow empty body — fields are optional.
		req = service.StartSessionRequest{}
	}
	session, err := h.svc.StartSession(r.Context(), id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, session)
}

// SubmitResponses handles POST /assessments/{id}/responses.
func (h *AssessmentHandler) SubmitResponses(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.SubmitResponsesRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	count, err := h.svc.SubmitResponses(r.Context(), id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"saved": count})
}

// Complete handles POST /assessments/{id}/complete.
func (h *AssessmentHandler) Complete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Complete(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// GetResults handles GET /assessments/{id}/results.
func (h *AssessmentHandler) GetResults(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	results, err := h.svc.GetResults(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, results)
}

// GetByToken handles GET /assessments/candidate/{token}.
func (h *AssessmentHandler) GetByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "missing token"})
		return
	}
	a, err := h.svc.GetByToken(r.Context(), token)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, a)
}

// SubmitCandidateResponses handles POST /assessments/candidate/{token}/responses.
func (h *AssessmentHandler) SubmitCandidateResponses(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "missing token"})
		return
	}
	var req service.SubmitResponsesRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	count, err := h.svc.SubmitCandidateResponses(r.Context(), token, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"saved": count})
}

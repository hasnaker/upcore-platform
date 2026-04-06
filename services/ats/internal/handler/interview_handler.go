package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/service"
)

// InterviewHandler exposes interview endpoints.
type InterviewHandler struct {
	svc *service.InterviewService
	dep Dependencies
}

// NewInterviewHandler constructs an InterviewHandler.
func NewInterviewHandler(svc *service.InterviewService, dep Dependencies) *InterviewHandler {
	return &InterviewHandler{svc: svc, dep: dep}
}

// Schedule handles POST /api/v1/ats/interviews.
func (h *InterviewHandler) Schedule(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.ScheduleInterviewRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Schedule(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, result)
}

// Get handles GET /api/v1/ats/interviews/{id}.
func (h *InterviewHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	interview, err := h.svc.GetByID(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, interview)
}

// Patch handles PATCH /api/v1/ats/interviews/{id} (reschedule/update).
func (h *InterviewHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req struct {
		ScheduledAt     string `json:"scheduled_at,omitempty"`
		DurationMinutes int    `json:"duration_minutes,omitempty"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Reschedule(r.Context(), tid, id, req.ScheduledAt, req.DurationMinutes)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Cancel handles POST /api/v1/ats/interviews/{id}/cancel.
func (h *InterviewHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Cancel(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Complete handles POST /api/v1/ats/interviews/{id}/complete.
func (h *InterviewHandler) Complete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.MarkCompleted(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// SubmitFeedback handles POST /api/v1/ats/interviews/{id}/feedback.
func (h *InterviewHandler) SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.FeedbackRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.SubmitFeedback(r.Context(), tid, id, req, uid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// ListMine handles GET /api/v1/ats/interviews/mine.
func (h *InterviewHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil || uid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	from := ParseTimeQuery(r, "from", time.Now().AddDate(0, 0, -7))
	to := ParseTimeQuery(r, "to", time.Now().AddDate(0, 0, 30))
	result, err := h.svc.ListForInterviewer(r.Context(), tid, uid, from, to)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

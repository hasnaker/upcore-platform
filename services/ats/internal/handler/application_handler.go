package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/repository"
	"github.com/upcore/ats/internal/service"
)

// ApplicationHandler exposes application endpoints.
type ApplicationHandler struct {
	appSvc      *service.ApplicationService
	pipelineSvc *service.PipelineService
	dep         Dependencies
}

// NewApplicationHandler constructs an ApplicationHandler.
func NewApplicationHandler(appSvc *service.ApplicationService, pipelineSvc *service.PipelineService, dep Dependencies) *ApplicationHandler {
	return &ApplicationHandler{appSvc: appSvc, pipelineSvc: pipelineSvc, dep: dep}
}

// List handles GET /api/v1/ats/applications.
func (h *ApplicationHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	f := repository.ApplicationFilter{
		TenantID:      tid,
		RequisitionID: ParseUUIDQuery(r, "requisition_id"),
		CandidateID:   ParseUUIDQuery(r, "candidate_id"),
		Stage:         r.URL.Query().Get("stage"),
		Page:          ParseIntQuery(r, "page", 1),
		Limit:         ParseIntQuery(r, "limit", 50),
	}
	items, total, err := h.appSvc.List(r.Context(), f)
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

// Submit handles POST /api/v1/ats/applications.
func (h *ApplicationHandler) Submit(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.SubmitApplicationRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.appSvc.Submit(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, result)
}

// Get handles GET /api/v1/ats/applications/{id}.
func (h *ApplicationHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.appSvc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Move handles POST /api/v1/ats/applications/{id}/move.
func (h *ApplicationHandler) Move(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.MoveRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	toStage := domain.Stage(req.ToStage)
	if !toStage.IsValid() {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid stage"})
		return
	}
	result, err := h.pipelineSvc.MoveToStage(r.Context(), tid, id, toStage, uid, req.Reason)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Reject handles POST /api/v1/ats/applications/{id}/reject.
func (h *ApplicationHandler) Reject(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.RejectRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.appSvc.Reject(r.Context(), tid, id, req.Reason, uid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Score handles POST /api/v1/ats/applications/{id}/score.
func (h *ApplicationHandler) Score(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.ScoreRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.appSvc.Score(r.Context(), tid, id, req.Score, uid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// AddNote handles POST /api/v1/ats/applications/{id}/notes.
func (h *ApplicationHandler) AddNote(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.NoteRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.appSvc.AddNote(r.Context(), tid, id, req.Note, uid); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
}

// ListEvents handles GET /api/v1/ats/applications/{id}/events.
func (h *ApplicationHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	events, err := h.appSvc.ListEvents(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, events)
}

// BulkMove handles POST /api/v1/ats/applications/bulk-move.
func (h *ApplicationHandler) BulkMove(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	var req service.BulkMoveRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	toStage := domain.Stage(req.ToStage)
	if !toStage.IsValid() {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid stage"})
		return
	}
	moved, errs := h.pipelineSvc.BulkMove(r.Context(), tid, req.ApplicationIDs, toStage, uid, req.Reason)
	errMsgs := make([]string, 0, len(errs))
	for _, e := range errs {
		errMsgs = append(errMsgs, e.Error())
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"moved":  moved,
		"errors": errMsgs,
	})
}

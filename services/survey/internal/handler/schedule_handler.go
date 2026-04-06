package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/middleware"
	"github.com/upcore/survey/internal/service"
)

// ScheduleHandler exposes schedule management endpoints.
type ScheduleHandler struct {
	svc     *service.ScheduleService
	distSvc *service.DistributionService
	log     zerolog.Logger
}

// NewScheduleHandler constructs a ScheduleHandler.
func NewScheduleHandler(svc *service.ScheduleService, distSvc *service.DistributionService, log zerolog.Logger) *ScheduleHandler {
	return &ScheduleHandler{svc: svc, distSvc: distSvc, log: log}
}

// List handles GET /surveys/schedules.
func (h *ScheduleHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	activeOnly := r.URL.Query().Get("active") == "true"
	limit := ParseIntQuery(r, "limit", 50)
	page := ParseIntQuery(r, "page", 1)
	offset := (page - 1) * limit

	items, total, err := h.svc.List(r.Context(), tid, activeOnly, limit, offset)
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

// Create handles POST /surveys/schedules.
func (h *ScheduleHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())

	var req service.CreateScheduleRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	req.TenantID = tid
	req.CreatedBy = &uid

	sched, err := h.svc.Create(r.Context(), req)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, sched)
}

// Get handles GET /surveys/schedules/{id}.
func (h *ScheduleHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	sched, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sched)
}

// Update handles PATCH /surveys/schedules/{id}.
func (h *ScheduleHandler) Update(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var updates map[string]any
	if err := DecodeJSON(r, &updates); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	sched, err := h.svc.Update(r.Context(), tid, id, updates)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sched)
}

// Pause handles POST /surveys/schedules/{id}/pause.
func (h *ScheduleHandler) Pause(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Pause(r.Context(), tid, id); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "paused"})
}

// Resume handles POST /surveys/schedules/{id}/resume.
func (h *ScheduleHandler) Resume(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Resume(r.Context(), tid, id); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "resumed"})
}

// Delete handles DELETE /surveys/schedules/{id}.
func (h *ScheduleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), tid, id); err != nil {
		WriteDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DistributeNow handles POST /surveys/schedules/{id}/distribute-now.
func (h *ScheduleHandler) DistributeNow(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	dist, err := h.distSvc.Distribute(r.Context(), tid, id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{"distribution_id": dist.ID})
}

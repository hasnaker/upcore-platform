package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// OnboardingHandler exposes onboarding HTTP endpoints.
type OnboardingHandler struct {
	svc *service.OnboardingService
}

// NewOnboardingHandler constructs the handler.
func NewOnboardingHandler(svc *service.OnboardingService) *OnboardingHandler {
	return &OnboardingHandler{svc: svc}
}

// Start handles POST /employees/{id}/onboarding.
func (h *OnboardingHandler) Start(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.StartRequest
	if r.ContentLength > 0 {
		if err := DecodeJSON(r, &req); err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
			return
		}
	}
	c, err := h.svc.Start(r.Context(), tid, empID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, c)
}

// GetForEmployee handles GET /employees/{id}/onboarding.
func (h *OnboardingHandler) GetForEmployee(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.GetForEmployee(r.Context(), tid, empID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// List handles GET /onboarding.
func (h *OnboardingHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	status := r.URL.Query().Get("status")
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 50)
	items, total, err := h.svc.List(r.Context(), tid, status, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Get handles GET /onboarding/{id}.
func (h *OnboardingHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// PatchTask handles PATCH /onboarding/tasks/{taskId}.
func (h *OnboardingHandler) PatchTask(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	taskID, ok := ParseUUID(w, chi.URLParam(r, "taskId"))
	if !ok {
		return
	}
	var req service.TaskUpdateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	t, err := h.svc.UpdateTask(r.Context(), tid, taskID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, t)
}

// Templates handles GET /onboarding/templates.
func (h *OnboardingHandler) Templates(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": h.svc.Templates(),
	})
}

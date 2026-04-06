package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/middleware"
	"github.com/upcore/survey/internal/service"
)

// SurveyHandler exposes survey CRUD endpoints.
type SurveyHandler struct {
	svc *service.SurveyService
	log zerolog.Logger
}

// NewSurveyHandler constructs a SurveyHandler.
func NewSurveyHandler(svc *service.SurveyService, log zerolog.Logger) *SurveyHandler {
	return &SurveyHandler{svc: svc, log: log}
}

// List handles GET /surveys.
func (h *SurveyHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "missing tenant")
		return
	}
	limit := ParseIntQuery(r, "limit", 50)
	page := ParseIntQuery(r, "page", 1)
	offset := (page - 1) * limit

	items, total, err := h.svc.List(r.Context(), tid, limit, offset)
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

// GetByCode handles GET /surveys/{code}.
func (h *SurveyHandler) GetByCode(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	code := chi.URLParam(r, "code")

	survey, err := h.svc.GetByCode(r.Context(), tid, code)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, survey)
}

// GetItems handles GET /surveys/{code}/items.
func (h *SurveyHandler) GetItems(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	code := chi.URLParam(r, "code")

	survey, items, err := h.svc.GetWithItems(r.Context(), tid, code)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"survey": survey,
		"items":  items,
	})
}

// Create handles POST /surveys.
func (h *SurveyHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())

	var req service.CreateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	req.TenantID = tid
	req.CreatedBy = &uid

	survey, err := h.svc.Create(r.Context(), req)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, survey)
}

// Update handles PATCH /surveys/{id}.
func (h *SurveyHandler) Update(w http.ResponseWriter, r *http.Request) {
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

	survey, err := h.svc.Update(r.Context(), tid, id, updates)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, survey)
}

// ListPending handles GET /surveys/mine/pending.
func (h *SurveyHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil || uid == uuid.Nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "missing context")
		return
	}
	// TODO: look up employee_id from user_id, then list pending invitations
	WriteJSON(w, http.StatusOK, map[string]any{"items": []any{}})
}

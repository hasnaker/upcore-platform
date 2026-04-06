package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/middleware"
	"github.com/upcore/notification/internal/service"
)

// TemplateHandler exposes HTTP endpoints for notification template operations.
type TemplateHandler struct {
	svc *service.TemplateService
}

// NewTemplateHandler constructs a TemplateHandler.
func NewTemplateHandler(svc *service.TemplateService) *TemplateHandler {
	return &TemplateHandler{svc: svc}
}

// List handles GET /api/v1/notifications/templates.
func (h *TemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	q := r.URL.Query()

	var tid *uuid.UUID
	if tenantID != uuid.Nil {
		tid = &tenantID
	}

	channel := q.Get("channel")
	locale := q.Get("locale")
	activeOnly := q.Get("is_active") != "false"
	page := ParseIntQuery(r, "page", 1)
	limit := ParseIntQuery(r, "limit", 50)

	items, total, err := h.svc.List(r.Context(), tid, channel, locale, activeOnly, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

// GetByCode handles GET /api/v1/notifications/templates/{code}.
func (h *TemplateHandler) GetByCode(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	code := chi.URLParam(r, "code")
	locale := r.URL.Query().Get("locale")
	if locale == "" {
		locale = "tr-TR"
	}

	var tid *uuid.UUID
	if tenantID != uuid.Nil {
		tid = &tenantID
	}

	tmpl, err := h.svc.GetByCode(r.Context(), tid, code, locale)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, tmpl)
}

// Create handles POST /api/v1/notifications/templates.
func (h *TemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())

	var t domain.Template
	if err := DecodeJSON(r, &t); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	if tenantID != uuid.Nil {
		t.TenantID = &tenantID
	}

	if err := h.svc.Create(r.Context(), &t); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, t)
}

// Update handles PATCH /api/v1/notifications/templates/{id}.
func (h *TemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		WriteError(w, err)
		return
	}

	if err := DecodeJSON(r, existing); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	existing.ID = id

	if err := h.svc.Update(r.Context(), existing); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, existing)
}

// Activate handles POST /api/v1/notifications/templates/{id}/activate.
func (h *TemplateHandler) Activate(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Activate(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "activated"})
}

// Deactivate handles POST /api/v1/notifications/templates/{id}/deactivate.
func (h *TemplateHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Deactivate(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "deactivated"})
}

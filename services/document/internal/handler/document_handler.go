package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/repository"
	"github.com/upcore/document/internal/service"
)

// DocumentHandler serves CRUD endpoints on /documents.
type DocumentHandler struct {
	svc *service.DocumentService
	dep Dependencies
}

// NewDocumentHandler constructs a DocumentHandler.
func NewDocumentHandler(svc *service.DocumentService, dep Dependencies) *DocumentHandler {
	return &DocumentHandler{svc: svc, dep: dep}
}

// List handles GET /documents.
func (h *DocumentHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	q := r.URL.Query()

	var filters repository.ListFilters
	if v := q.Get("owner_employee_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			WriteError(w, domain.ErrValidation)
			return
		}
		filters.OwnerEmployeeID = &id
	}
	if v := q.Get("type"); v != "" {
		t, err := domain.ParseDocType(v)
		if err != nil {
			WriteError(w, err)
			return
		}
		filters.Category = &t
	}
	if v := q.Get("is_signed"); v != "" {
		b := v == "true" || v == "1"
		filters.IsSigned = &b
	}
	if v := q.Get("expiring_within_days"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n <= 0 {
			WriteError(w, domain.ErrValidation)
			return
		}
		filters.ExpiringWithinDays = &n
	}
	filters.Search = q.Get("search")
	filters.Page, _ = strconv.Atoi(q.Get("page"))
	filters.Limit, _ = strconv.Atoi(q.Get("limit"))

	items, total, err := h.svc.List(ctx, tenantID, filters)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  filters.Page,
		"limit": filters.Limit,
	})
}

// Get handles GET /documents/{id}.
func (h *DocumentHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	d, err := h.svc.Get(ctx, tenantID, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

// PatchRequest represents the JSON body for PATCH /documents/{id}.
type PatchRequest struct {
	Title          *string    `json:"title"`
	Description    *string    `json:"description"`
	Tags           []string   `json:"tags"`
	IsConfidential *bool      `json:"is_confidential"`
	RetentionUntil *time.Time `json:"retention_until"`
}

// Patch handles PATCH /documents/{id}.
func (h *DocumentHandler) Patch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	var body PatchRequest
	if err := DecodeJSON(r, &body); err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	d, err := h.svc.UpdateMetadata(ctx, tenantID, id, service.UpdateRequest{
		Title:          body.Title,
		Description:    body.Description,
		Tags:           body.Tags,
		IsConfidential: body.IsConfidential,
		RetentionUntil: body.RetentionUntil,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

// Delete handles DELETE /documents/{id}.
func (h *DocumentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	userID := middleware.UserIDFromContext(ctx)
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	if err := h.svc.Delete(ctx, tenantID, id, userID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}

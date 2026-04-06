package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// CatalogHandler exposes intervention catalog CRUD endpoints.
type CatalogHandler struct {
	svc *service.CatalogService
	log zerolog.Logger
}

// NewCatalogHandler constructs a CatalogHandler.
func NewCatalogHandler(svc *service.CatalogService, log zerolog.Logger) *CatalogHandler {
	return &CatalogHandler{svc: svc, log: log}
}

// List handles GET /interventions/catalog.
func (h *CatalogHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := ParseIntQuery(r, "limit", 50)
	page := ParseIntQuery(r, "page", 1)
	offset := (page - 1) * limit

	f := domain.CatalogFilter{
		Limit:  limit,
		Offset: offset,
	}
	if s := r.URL.Query().Get("category"); s != "" {
		cat := domain.Category(s)
		f.Category = &cat
	}
	if s := r.URL.Query().Get("evidence_tier"); s != "" {
		tier := domain.EvidenceTier(s)
		f.EvidenceTier = &tier
	}
	if s := r.URL.Query().Get("delivery_mode"); s != "" {
		mode := domain.DeliveryMode(s)
		f.DeliveryMode = &mode
	}
	if s := r.URL.Query().Get("dimension"); s != "" {
		f.TargetDriver = &s
	}
	if r.URL.Query().Get("is_active") == "true" {
		f.ActiveOnly = true
	}
	if s := r.URL.Query().Get("q"); s != "" {
		f.Search = s
	}

	items, total, err := h.svc.List(r.Context(), f)
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

// Get handles GET /interventions/catalog/{id}.
func (h *CatalogHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	item, err := h.svc.Get(r.Context(), id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, item)
}

// Create handles POST /interventions/catalog.
func (h *CatalogHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	var i domain.Intervention
	if err := DecodeJSON(r, &i); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	i.TenantID = &tid

	if err := h.svc.Create(r.Context(), &i); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, i)
}

// Update handles PATCH /interventions/catalog/{id}.
func (h *CatalogHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var updates map[string]any
	if err := DecodeJSON(r, &updates); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	item, err := h.svc.Update(r.Context(), id, updates)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, item)
}

// Activate handles POST /interventions/catalog/{id}/activate.
func (h *CatalogHandler) Activate(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Activate(r.Context(), id); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "activated"})
}

// Deactivate handles POST /interventions/catalog/{id}/deactivate.
func (h *CatalogHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Deactivate(r.Context(), id); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "deactivated"})
}

package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/middleware"
	"github.com/upcore/survey/internal/repository"
	"github.com/upcore/survey/internal/service"
)

// DistributionHandler exposes distribution management endpoints.
type DistributionHandler struct {
	svc *service.DistributionService
	log zerolog.Logger
}

// NewDistributionHandler constructs a DistributionHandler.
func NewDistributionHandler(svc *service.DistributionService, log zerolog.Logger) *DistributionHandler {
	return &DistributionHandler{svc: svc, log: log}
}

// List handles GET /surveys/distributions.
func (h *DistributionHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	limit := ParseIntQuery(r, "limit", 50)
	page := ParseIntQuery(r, "page", 1)
	offset := (page - 1) * limit

	f := repository.DistFilter{
		TenantID: tid,
		SurveyID: ParseUUIDQuery(r, "survey_id"),
		Limit:    limit,
		Offset:   offset,
	}

	if s := r.URL.Query().Get("status"); s != "" {
		st := domain.DistStatus(s)
		f.Status = &st
	}
	if s := r.URL.Query().Get("from"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			f.From = &t
		}
	}
	if s := r.URL.Query().Get("to"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			f.To = &t
		}
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

// Get handles GET /surveys/distributions/{id}.
func (h *DistributionHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	dist, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"distribution":   dist,
		"response_count": dist.ResponseCount,
		"response_rate":  dist.ResponseRate(),
	})
}

// Close handles POST /surveys/distributions/{id}/close.
func (h *DistributionHandler) Close(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Close(r.Context(), tid, id); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "closed"})
}

// Remind handles POST /surveys/distributions/{id}/remind.
func (h *DistributionHandler) Remind(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.SendReminders(r.Context(), tid, id); err != nil {
		WriteDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

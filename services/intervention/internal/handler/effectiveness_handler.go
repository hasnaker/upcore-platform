package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// EffectivenessHandler exposes effectiveness analytics endpoints.
type EffectivenessHandler struct {
	svc *service.EffectivenessService
	log zerolog.Logger
}

// NewEffectivenessHandler constructs an EffectivenessHandler.
func NewEffectivenessHandler(svc *service.EffectivenessService, log zerolog.Logger) *EffectivenessHandler {
	return &EffectivenessHandler{svc: svc, log: log}
}

// List handles GET /interventions/effectiveness.
func (h *EffectivenessHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	posteriors, err := h.svc.GetRanking(r.Context(), tid)
	if err != nil {
		WriteServerError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": posteriors})
}

// GetByIntervention handles GET /interventions/effectiveness/{interventionId}.
func (h *EffectivenessHandler) GetByIntervention(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "interventionId"))
	if !ok {
		return
	}
	posteriors, err := h.svc.GetByIntervention(r.Context(), id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"by_dimension": posteriors})
}

// Recompute handles POST /interventions/effectiveness/recompute.
func (h *EffectivenessHandler) Recompute(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	go func() {
		_ = h.svc.RecomputeAll(r.Context(), tid)
	}()
	w.WriteHeader(http.StatusAccepted)
}

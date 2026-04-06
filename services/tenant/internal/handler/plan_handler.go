package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/upcore/tenant/internal/repository"
)

// PlanHandler exposes the plan catalog.
type PlanHandler struct {
	repo repository.PlanRepository
	dep  Dependencies
}

// NewPlanHandler constructs a PlanHandler.
func NewPlanHandler(repo repository.PlanRepository, dep Dependencies) *PlanHandler {
	return &PlanHandler{repo: repo, dep: dep}
}

// List handles GET /plans.
func (h *PlanHandler) List(w http.ResponseWriter, r *http.Request) {
	plans, err := h.repo.ListActive(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": plans, "count": len(plans)})
}

// Get handles GET /plans/{id}.
func (h *PlanHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	p, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

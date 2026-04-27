package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/middleware"
	"github.com/upcore/mobility/internal/service"
)

type CareerPathHandler struct {
	svc    *service.CareerPathService
	logger zerolog.Logger
}

func NewCareerPathHandler(svc *service.CareerPathService, logger zerolog.Logger) *CareerPathHandler {
	return &CareerPathHandler{svc: svc, logger: logger}
}

// Create — POST /api/v1/mobility/career-paths
func (h *CareerPathHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	var body struct {
		NameTR     string `json:"name_tr"`
		DescTR     string `json:"description_tr"`
		Discipline string `json:"discipline"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	p, err := h.svc.Create(r.Context(), service.CreateInput{
		TenantID:   tenantID,
		NameTR:     body.NameTR,
		DescTR:     body.DescTR,
		Discipline: body.Discipline,
	})
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusCreated, p)
}

// List — GET /api/v1/mobility/career-paths?discipline=...
func (h *CareerPathHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	discipline := r.URL.Query().Get("discipline")
	rows, err := h.svc.List(r.Context(), tenantID, discipline)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"paths": rows, "total": len(rows)})
}

// Get — GET /api/v1/mobility/career-paths/{id}
func (h *CareerPathHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	pathID, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	p, steps, err := h.svc.Get(r.Context(), tenantID, pathID)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"path": p, "steps": steps})
}

// AddStep — POST /api/v1/mobility/career-paths/{id}/steps
func (h *CareerPathHandler) AddStep(w http.ResponseWriter, r *http.Request) {
	pathID, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	var body struct {
		StepOrder       int       `json:"step_order"`
		PositionID      uuid.UUID `json:"position_id"`
		TitleTR         string    `json:"title_tr"`
		MinTenureMonths int       `json:"min_tenure_months"`
		CriteriaTR      string    `json:"criteria_tr"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	step, err := h.svc.AddStep(r.Context(), service.AddStepInput{
		PathID:          pathID,
		StepOrder:       body.StepOrder,
		PositionID:      body.PositionID,
		TitleTR:         body.TitleTR,
		MinTenureMonths: body.MinTenureMonths,
		CriteriaTR:      body.CriteriaTR,
	})
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusCreated, step)
}

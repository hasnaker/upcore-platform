package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/middleware"
	"github.com/upcore/mobility/internal/service"
)

type SuccessionHandler struct {
	svc    *service.SuccessionService
	logger zerolog.Logger
}

func NewSuccessionHandler(svc *service.SuccessionService, logger zerolog.Logger) *SuccessionHandler {
	return &SuccessionHandler{svc: svc, logger: logger}
}

// UpsertPlan — POST /api/v1/mobility/succession-plans
func (h *SuccessionHandler) UpsertPlan(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	var body struct {
		PositionID     uuid.UUID `json:"position_id"`
		IncumbentEmpID uuid.UUID `json:"incumbent_employee_id"`
		RiskLevel      string    `json:"risk_level"`
		CriticalityTR  string    `json:"criticality_tr"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	p, err := h.svc.UpsertPlan(r.Context(), service.UpsertPlanInput{
		TenantID:       tenantID,
		PositionID:     body.PositionID,
		IncumbentEmpID: body.IncumbentEmpID,
		RiskLevel:      body.RiskLevel,
		CriticalityTR:  body.CriticalityTR,
	})
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// ListPlans — GET /api/v1/mobility/succession-plans
func (h *SuccessionHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	rows, err := h.svc.ListPlans(r.Context(), tenantID)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"plans": rows, "total": len(rows)})
}

// ListCriticalPositions — GET /api/v1/mobility/succession-plans/critical
// Returns the enriched list used by the UI: plan + incumbent + candidate
// counters + department/title strings.
func (h *SuccessionHandler) ListCriticalPositions(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	rows, err := h.svc.ListCriticalPositions(r.Context(), tenantID)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": rows, "total": len(rows)})
}

// GetPlan — GET /api/v1/mobility/succession-plans/{planId}
func (h *SuccessionHandler) GetPlan(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	planID, ok := ParseUUID(w, chi.URLParam(r, "planId"), "planId")
	if !ok {
		return
	}
	p, err := h.svc.GetPlan(r.Context(), tenantID, planID)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// Candidates — GET /api/v1/mobility/succession-plans/{planId}/candidates
func (h *SuccessionHandler) Candidates(w http.ResponseWriter, r *http.Request) {
	planID, ok := ParseUUID(w, chi.URLParam(r, "planId"), "planId")
	if !ok {
		return
	}
	rows, err := h.svc.Candidates(r.Context(), planID)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"candidates": rows, "total": len(rows)})
}

// AddCandidate — POST /api/v1/mobility/succession-plans/{planId}/candidates
func (h *SuccessionHandler) AddCandidate(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	planID, ok := ParseUUID(w, chi.URLParam(r, "planId"), "planId")
	if !ok {
		return
	}
	var body struct {
		CandidateEmployeeID uuid.UUID `json:"candidate_employee_id"`
		Readiness           string    `json:"readiness"`
		FitScore            float64   `json:"fit_score"`
		GapsTR              string    `json:"gaps_tr"`
		Rank                int       `json:"rank"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	c, err := h.svc.AddCandidate(r.Context(), tenantID, service.AddCandidateInput{
		PlanID:              planID,
		CandidateEmployeeID: body.CandidateEmployeeID,
		Readiness:           body.Readiness,
		FitScore:            body.FitScore,
		GapsTR:              body.GapsTR,
		Rank:                body.Rank,
	})
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusCreated, c)
}

// UpdateReadiness — PATCH /api/v1/mobility/succession-plans/{planId}/candidates/{candidateId}
func (h *SuccessionHandler) UpdateReadiness(w http.ResponseWriter, r *http.Request) {
	candidateID, ok := ParseUUID(w, chi.URLParam(r, "candidateId"), "candidateId")
	if !ok {
		return
	}
	var body struct {
		Readiness string   `json:"readiness"`
		FitScore  *float64 `json:"fit_score,omitempty"`
		GapsTR    *string  `json:"gaps_tr,omitempty"`
		Rank      *int     `json:"rank,omitempty"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	c, err := h.svc.UpdateReadiness(r.Context(), service.UpdateReadinessInput{
		CandidateID: candidateID,
		Readiness:   body.Readiness,
		FitScore:    body.FitScore,
		GapsTR:      body.GapsTR,
		Rank:        body.Rank,
	})
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// RemoveCandidate — DELETE /api/v1/mobility/succession-plans/{planId}/candidates/{candidateId}
func (h *SuccessionHandler) RemoveCandidate(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	candidateID, ok := ParseUUID(w, chi.URLParam(r, "candidateId"), "candidateId")
	if !ok {
		return
	}
	if err := h.svc.RemoveCandidate(r.Context(), tenantID, candidateID); err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

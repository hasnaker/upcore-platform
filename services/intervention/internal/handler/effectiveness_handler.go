package handler

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

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

// Summary handles GET /interventions/effectiveness/summary. Returns the
// tenant-wide effect-size roll-up consumed by the dashboard panel.
func (h *EffectivenessHandler) Summary(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	out, err := h.svc.GetTenantSummary(r.Context(), tid)
	if err != nil {
		WriteServerError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// Detail handles GET /interventions/effectiveness/{interventionId}/detail.
// Includes the summary row, weekly rolling trend, and per-employee entries.
func (h *EffectivenessHandler) Detail(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "interventionId"))
	if !ok {
		return
	}
	weeks := ParseIntQuery(r, "weeks", 8)
	out, err := h.svc.GetDetail(r.Context(), tid, id, weeks)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// Trends handles GET /interventions/effectiveness/trends?weeks=8. Returns one
// time-series per active catalog item with weekly rolling Cohen's d + CI.
func (h *EffectivenessHandler) Trends(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	weeks := ParseIntQuery(r, "weeks", 8)
	out, err := h.svc.GetTrends(r.Context(), tid, weeks)
	if err != nil {
		WriteServerError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// ExportCSV handles GET /interventions/effectiveness/export.csv. Streams the
// tenant summary as RFC 4180 CSV.
func (h *EffectivenessHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	out, err := h.svc.GetTenantSummary(r.Context(), tid)
	if err != nil {
		WriteServerError(w, err)
		return
	}

	filename := fmt.Sprintf("intervention-effectiveness-%s.csv", time.Now().UTC().Format("20060102"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))

	cw := csv.NewWriter(w)
	defer cw.Flush()

	_ = cw.Write([]string{
		"intervention_code",
		"title_tr",
		"category",
		"evidence_tier",
		"n_total",
		"n_completed",
		"cohens_d",
		"ci_low",
		"ci_high",
		"p_value",
		"mean_pre",
		"mean_post",
		"avg_bat_drop",
		"effect_category",
		"insufficient",
	})

	for _, it := range out.Items {
		_ = cw.Write([]string{
			it.Code,
			it.TitleTR,
			string(it.Category),
			string(it.EvidenceTier),
			strconv.Itoa(it.NTotal),
			strconv.Itoa(it.NCompleted),
			fmtFloatPtr(it.CohensD),
			fmtFloatPtr(it.CILow),
			fmtFloatPtr(it.CIHigh),
			fmtFloatPtr(it.PValue),
			fmtFloatPtr(it.MeanPre),
			fmtFloatPtr(it.MeanPost),
			fmtFloatPtr(it.AvgBATDrop),
			it.EffectCategory,
			strconv.FormatBool(it.Insufficient),
		})
	}
}

func fmtFloatPtr(v *float64) string {
	if v == nil {
		return ""
	}
	return strconv.FormatFloat(*v, 'f', 4, 64)
}

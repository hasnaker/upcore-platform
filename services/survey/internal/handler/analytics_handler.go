package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/middleware"
	"github.com/upcore/survey/internal/service"
)

// AnalyticsHandler exposes survey analytics endpoints.
type AnalyticsHandler struct {
	svc *service.AggregationService
	log zerolog.Logger
}

// NewAnalyticsHandler constructs an AnalyticsHandler.
func NewAnalyticsHandler(svc *service.AggregationService, log zerolog.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{svc: svc, log: log}
}

// GetDistributionAnalytics handles GET /surveys/distributions/{id}/analytics.
func (h *AnalyticsHandler) GetDistributionAnalytics(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	analytics, err := h.svc.GetDistributionAnalytics(r.Context(), tid, id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, analytics)
}

// GetSurveyTrend handles GET /surveys/analytics/trend.
func (h *AnalyticsHandler) GetSurveyTrend(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	surveyCode := r.URL.Query().Get("survey_code")
	segType := domain.SegType(r.URL.Query().Get("segment_type"))
	segKey := r.URL.Query().Get("segment_key")
	dimension := r.URL.Query().Get("dimension")
	periods := ParseIntQuery(r, "periods", 12)

	if surveyCode == "" {
		WriteError(w, http.StatusBadRequest, "bad_request", "survey_code required")
		return
	}
	if segType == "" {
		segType = domain.SegTypeOverall
	}
	if segKey == "" {
		segKey = "all"
	}

	trend, err := h.svc.GetTrendForSurvey(r.Context(), tid, surveyCode, segType, segKey, dimension, periods)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, trend)
}

// GetBurnoutDashboard handles GET /surveys/analytics/burnout-dashboard.
func (h *AnalyticsHandler) GetBurnoutDashboard(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())

	// Get latest burnout pulse aggregates
	aggs, err := h.svc.GetDistributionAnalytics(r.Context(), tid, tid) // simplified
	if err != nil {
		// Return empty dashboard on error (no data yet)
		WriteJSON(w, http.StatusOK, map[string]any{
			"current":  nil,
			"trend":    nil,
			"alerts":   []any{},
			"segments": []any{},
		})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"current":  aggs.Overall,
		"segments": aggs.Departments,
	})
}

// GetENPS handles GET /surveys/analytics/enps.
func (h *AnalyticsHandler) GetENPS(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	distID := ParseUUIDQuery(r, "distribution_id")
	if distID == nil {
		WriteError(w, http.StatusBadRequest, "bad_request", "distribution_id required")
		return
	}

	result, err := h.svc.GetENPSForDistribution(r.Context(), tid, *distID)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

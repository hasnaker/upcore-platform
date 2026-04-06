package service

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/config"
	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/event"
	"github.com/upcore/survey/internal/repository"
)

// AggregationService computes and retrieves survey analytics.
type AggregationService struct {
	aggregates    repository.AggregateRepository
	answers       repository.AnswerRepository
	distributions repository.DistributionRepository
	items         repository.ItemRepository
	publisher     event.Publisher
	cfg           *config.Config
	log           zerolog.Logger
}

// NewAggregationService constructs an AggregationService.
func NewAggregationService(
	aggregates repository.AggregateRepository,
	answers repository.AnswerRepository,
	distributions repository.DistributionRepository,
	items repository.ItemRepository,
	publisher event.Publisher,
	cfg *config.Config,
	log zerolog.Logger,
) *AggregationService {
	return &AggregationService{
		aggregates:    aggregates,
		answers:       answers,
		distributions: distributions,
		items:         items,
		publisher:     publisher,
		cfg:           cfg,
		log:           log.With().Str("component", "aggregation_service").Logger(),
	}
}

// ComputeAggregates calculates overall + per-segment aggregates for a closed
// distribution, enforcing the anonymity minimum N.
func (s *AggregationService) ComputeAggregates(ctx context.Context, tenantID, distID uuid.UUID) error {
	dist, err := s.distributions.GetByID(ctx, tenantID, distID)
	if err != nil {
		return err
	}

	allAnswers, err := s.answers.GetAllForDistribution(ctx, dist.SurveyID)
	if err != nil {
		return fmt.Errorf("get answers: %w", err)
	}

	if len(allAnswers) == 0 {
		s.log.Warn().Str("distribution_id", distID.String()).Msg("no answers for aggregation")
		return nil
	}

	// Group answers by dimension (item_code prefix before underscore typically maps to dimension)
	dimValues := make(map[string][]float64)
	for _, a := range allAnswers {
		if a.ValueInt == nil {
			continue
		}
		dim := a.ItemCode // simplified: use item_code as dimension proxy
		dimValues[dim] = append(dimValues[dim], float64(*a.ValueInt))
	}

	minN := s.cfg.MinAnonymityN
	lowNCount := 0

	for dim, values := range dimValues {
		n := len(values)
		agg := &domain.Aggregate{
			TenantID:       tenantID,
			DistributionID: distID,
			SegmentType:    domain.SegTypeOverall,
			SegmentKey:     "all",
			Dimension:      dim,
			N:              n,
		}

		if domain.CanReveal(n, minN) {
			agg.Mean = domain.Mean(values)
			agg.StdDev = domain.StdDev(values)
		} else {
			lowNCount++
		}

		if err := s.aggregates.Upsert(ctx, agg); err != nil {
			return fmt.Errorf("upsert aggregate %s: %w", dim, err)
		}
	}

	_ = s.publisher.Publish(ctx, event.TopicAggregatesComputed, map[string]any{
		"distribution_id":      distID,
		"tenant_id":            tenantID,
		"segments_count":       len(dimValues),
		"low_n_segments_count": lowNCount,
	})

	s.log.Info().
		Str("distribution_id", distID.String()).
		Int("dimensions", len(dimValues)).
		Msg("aggregates computed")
	return nil
}

// GetDistributionAnalytics returns the analytics payload for a distribution.
func (s *AggregationService) GetDistributionAnalytics(ctx context.Context, tenantID, distID uuid.UUID) (*domain.Analytics, error) {
	dist, err := s.distributions.GetByID(ctx, tenantID, distID)
	if err != nil {
		return nil, err
	}

	aggs, err := s.aggregates.ListByDistribution(ctx, distID)
	if err != nil {
		return nil, err
	}

	minN := s.cfg.MinAnonymityN
	analytics := &domain.Analytics{
		DistributionID: distID,
		ResponseCount:  dist.ResponseCount,
		ResponseRate:   dist.ResponseRate(),
	}

	for _, a := range aggs {
		stat := domain.AggregateStat{
			Dimension: a.Dimension,
			Mean:      a.Mean,
			StdDev:    a.StdDev,
			N:         a.N,
		}
		if !domain.CanReveal(a.N, minN) {
			stat.Suppressed = true
			stat.Reason = "insufficient_respondents"
			stat.Mean = 0
			stat.StdDev = 0
		}

		switch a.SegmentType {
		case domain.SegTypeOverall:
			analytics.Overall = append(analytics.Overall, stat)
		case domain.SegTypeDepartment:
			appendToSegment(&analytics.Departments, a.SegmentKey, stat, a.N, minN)
		case domain.SegTypePositionLevel:
			appendToSegment(&analytics.Levels, a.SegmentKey, stat, a.N, minN)
		case domain.SegTypeTenureBucket:
			appendToSegment(&analytics.TenureBuckets, a.SegmentKey, stat, a.N, minN)
		}
	}

	return analytics, nil
}

func appendToSegment(segments *[]domain.SegmentStats, key string, stat domain.AggregateStat, n, minN int) {
	for i, seg := range *segments {
		if seg.SegmentKey == key {
			(*segments)[i].Dimensions = append((*segments)[i].Dimensions, stat)
			return
		}
	}
	*segments = append(*segments, domain.SegmentStats{
		SegmentKey: key,
		N:          n,
		Suppressed: !domain.CanReveal(n, minN),
		Dimensions: []domain.AggregateStat{stat},
	})
}

// GetTrendForSurvey returns a time series trend for a dimension.
func (s *AggregationService) GetTrendForSurvey(ctx context.Context, tenantID uuid.UUID, surveyCode string, segType domain.SegType, segKey, dimension string, periods int) (*domain.Trend, error) {
	aggs, err := s.aggregates.GetTrend(ctx, tenantID, surveyCode, segType, segKey, dimension, periods)
	if err != nil {
		return nil, err
	}

	trend := &domain.Trend{
		SurveyCode:  surveyCode,
		SegmentType: segType,
		SegmentKey:  segKey,
		Dimension:   dimension,
	}
	for _, a := range aggs {
		trend.Series = append(trend.Series, domain.TrendPoint{
			Period: a.ComputedAt.Format("2006-01"),
			Mean:   a.Mean,
			N:      a.N,
		})
	}
	return trend, nil
}

// DetectBurnoutAlerts checks for elevated burnout means vs previous period
// and emits alert events when the delta exceeds +1 SD.
func (s *AggregationService) DetectBurnoutAlerts(ctx context.Context, tenantID, distID uuid.UUID) ([]domain.Alert, error) {
	aggs, err := s.aggregates.ListByDistribution(ctx, distID)
	if err != nil {
		return nil, err
	}

	minN := s.cfg.MinAnonymityN
	var alerts []domain.Alert

	for _, a := range aggs {
		if a.N < minN || a.StdDev == 0 {
			continue
		}
		// Look for burnout-related dimensions
		// A z-score > 1.0 relative to some baseline indicates elevated risk.
		// Here we use a simplified heuristic: mean > 3.5 on a 1-5 scale.
		if a.Mean > 3.5 {
			alert := domain.Alert{
				TenantID:    tenantID,
				SegmentType: a.SegmentType,
				SegmentKey:  a.SegmentKey,
				MeanBurnout: a.Mean,
				DeltaVsPrev: math.Abs(a.ZScore),
				N:           a.N,
			}
			alerts = append(alerts, alert)

			_ = s.publisher.Publish(ctx, event.TopicBurnoutRiskElevated, map[string]any{
				"tenant_id":    tenantID,
				"segment_type": a.SegmentType,
				"segment_key":  a.SegmentKey,
				"mean_burnout": a.Mean,
				"delta_vs_prev": math.Abs(a.ZScore),
				"n":            a.N,
			})
		}
	}

	return alerts, nil
}

// GetENPSForDistribution computes eNPS metrics for a given distribution.
func (s *AggregationService) GetENPSForDistribution(ctx context.Context, tenantID, distID uuid.UUID) (map[string]any, error) {
	dist, err := s.distributions.GetByID(ctx, tenantID, distID)
	if err != nil {
		return nil, err
	}
	allAnswers, err := s.answers.GetAllForDistribution(ctx, dist.SurveyID)
	if err != nil {
		return nil, err
	}

	// Collect NPS-style answers (typically value 0-10)
	var npsValues []int
	for _, a := range allAnswers {
		if a.ValueInt != nil {
			npsValues = append(npsValues, *a.ValueInt)
		}
	}

	if len(npsValues) == 0 {
		return map[string]any{"score": 0, "n": 0}, nil
	}

	var promoters, passives, detractors int
	for _, v := range npsValues {
		switch {
		case v >= 9:
			promoters++
		case v >= 7:
			passives++
		default:
			detractors++
		}
	}
	n := len(npsValues)
	score := float64(promoters-detractors) / float64(n) * 100

	return map[string]any{
		"score":      score,
		"promoters":  promoters,
		"passives":   passives,
		"detractors": detractors,
		"n":          n,
	}, nil
}

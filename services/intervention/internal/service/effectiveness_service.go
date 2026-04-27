package service

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/event"
	"github.com/upcore/intervention/internal/repository"
	"github.com/upcore/intervention/internal/stats"
)

// EffectivenessService computes and retrieves intervention effectiveness metrics.
type EffectivenessService struct {
	effectiveness repository.EffectivenessRepository
	outcomes      repository.OutcomeRepository
	catalog       repository.CatalogRepository
	publisher     event.Publisher
	priorAlpha    float64
	priorBeta     float64
	threshold     float64
	log           zerolog.Logger
}

// NewEffectivenessService constructs an EffectivenessService.
func NewEffectivenessService(
	effectiveness repository.EffectivenessRepository,
	outcomes repository.OutcomeRepository,
	catalog repository.CatalogRepository,
	publisher event.Publisher,
	priorAlpha, priorBeta, threshold float64,
	log zerolog.Logger,
) *EffectivenessService {
	return &EffectivenessService{
		effectiveness: effectiveness,
		outcomes:      outcomes,
		catalog:       catalog,
		publisher:     publisher,
		priorAlpha:    priorAlpha,
		priorBeta:     priorBeta,
		threshold:     threshold,
		log:           log.With().Str("component", "effectiveness_service").Logger(),
	}
}

// RecomputeForIntervention aggregates all outcomes for an intervention,
// computes Cohen's d and paired t-test, and updates the posterior.
func (s *EffectivenessService) RecomputeForIntervention(ctx context.Context, interventionID uuid.UUID) error {
	outcomes, err := s.outcomes.ListWithBothScores(ctx, interventionID)
	if err != nil {
		return fmt.Errorf("list outcomes: %w", err)
	}

	if len(outcomes) < 2 {
		s.log.Info().
			Str("intervention_id", interventionID.String()).
			Int("n", len(outcomes)).
			Msg("insufficient outcomes for recomputation")
		return nil
	}

	pre := make([]float64, len(outcomes))
	post := make([]float64, len(outcomes))
	successes := 0

	for i, o := range outcomes {
		pre[i] = *o.PreBATScore
		post[i] = *o.PostBATScore
		if domain.IsSuccess(*o.PreBATScore, *o.PostBATScore, s.threshold) {
			successes++
		}
	}

	// Cohen's d
	d := stats.CohensD(pre, post)

	// Paired t-test
	_, pValue := stats.PairedTTest(pre, post)

	// Update Beta posterior
	alpha := s.priorAlpha + float64(successes)
	beta := s.priorBeta + float64(len(outcomes)-successes)

	posterior := &domain.Posterior{
		InterventionID: interventionID,
		Segment:        "overall",
		Alpha:          alpha,
		Beta:           beta,
		NObservations:  len(outcomes),
		MeanEffect:     &d,
	}
	if err := s.effectiveness.Upsert(ctx, posterior); err != nil {
		return fmt.Errorf("upsert posterior: %w", err)
	}

	_ = s.publisher.Publish(ctx, event.TopicEffectivenessUpdated, map[string]any{
		"intervention_id": interventionID,
		"n_completed":     len(outcomes),
		"cohens_d":        d,
		"p_value":         pValue,
		"effect_category": domain.EffectCategory(d),
	})

	s.log.Info().
		Str("intervention_id", interventionID.String()).
		Int("n", len(outcomes)).
		Float64("cohens_d", d).
		Float64("p_value", pValue).
		Msg("effectiveness recomputed")
	return nil
}

// RecomputeAll recomputes effectiveness for all interventions for a tenant.
func (s *EffectivenessService) RecomputeAll(ctx context.Context, tenantID uuid.UUID) error {
	interventions, err := s.catalog.ListActive(ctx, tenantID)
	if err != nil {
		return err
	}
	for _, i := range interventions {
		if err := s.RecomputeForIntervention(ctx, i.ID); err != nil {
			s.log.Error().Err(err).
				Str("intervention_id", i.ID.String()).
				Msg("recompute failed")
			// Continue with other interventions
		}
	}
	s.log.Info().Int("count", len(interventions)).Msg("effectiveness recomputation complete")
	return nil
}

// GetRanking returns posteriors ranked by expected success for a given dimension.
func (s *EffectivenessService) GetRanking(ctx context.Context, tenantID uuid.UUID) ([]*domain.Posterior, error) {
	return s.effectiveness.ListByTenant(ctx, tenantID)
}

// GetByIntervention returns effectiveness data for a specific intervention.
func (s *EffectivenessService) GetByIntervention(ctx context.Context, interventionID uuid.UUID) ([]*domain.Posterior, error) {
	return s.effectiveness.ListByIntervention(ctx, interventionID)
}

// ============================================================================
// Effectiveness summary, detail, and trend (canlı UI için).
// ============================================================================

// EffectivenessSummaryItem is the per-intervention roll-up returned to the UI.
// When the sample size is below stats.MinSampleSize the d, ci_low, ci_high and
// p_value fields are nil so the client can render "Yetersiz veri".
type EffectivenessSummaryItem struct {
	InterventionID uuid.UUID       `json:"intervention_id"`
	Code           string          `json:"code"`
	TitleTR        string          `json:"title_tr"`
	Category       domain.Category `json:"category"`
	EvidenceTier   domain.EvidenceTier `json:"evidence_tier"`
	NTotal         int             `json:"n_total"`
	NCompleted     int             `json:"n_completed"`
	CohensD        *float64        `json:"cohens_d,omitempty"`
	CILow          *float64        `json:"ci_low,omitempty"`
	CIHigh         *float64        `json:"ci_high,omitempty"`
	PValue         *float64        `json:"p_value,omitempty"`
	MeanPre        *float64        `json:"mean_pre,omitempty"`
	MeanPost       *float64        `json:"mean_post,omitempty"`
	AvgBATDrop     *float64        `json:"avg_bat_drop,omitempty"`
	EffectCategory string          `json:"effect_category"`
	Insufficient   bool            `json:"insufficient"`
}

// EffectivenessSummary aggregates per-intervention effect sizes for a tenant.
type EffectivenessSummary struct {
	GeneratedAt time.Time                    `json:"generated_at"`
	Items       []EffectivenessSummaryItem   `json:"items"`
}

// GetTenantSummary aggregates tenant-wide effectiveness. Each intervention
// that has at least one paired outcome gets a row; rows below MinSampleSize
// carry insufficient=true and nil statistical fields.
func (s *EffectivenessService) GetTenantSummary(ctx context.Context, tenantID uuid.UUID) (*EffectivenessSummary, error) {
	interventions, err := s.catalog.ListActive(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list active: %w", err)
	}

	outcomes, err := s.outcomes.ListWithBothScoresByTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list tenant outcomes: %w", err)
	}
	grouped := groupOutcomesByIntervention(outcomes)

	items := make([]EffectivenessSummaryItem, 0, len(interventions))
	for _, iv := range interventions {
		outs := grouped[iv.ID]
		item := buildSummaryItem(iv, outs)
		if item.NTotal == 0 {
			continue
		}
		items = append(items, item)
	}

	sort.SliceStable(items, func(i, j int) bool {
		return summaryRank(items[i]) > summaryRank(items[j])
	})

	return &EffectivenessSummary{
		GeneratedAt: time.Now().UTC(),
		Items:       items,
	}, nil
}

// summaryRank orders items so that measured large effects appear first and
// "insufficient" rows sink to the bottom (but are still returned for
// transparency).
func summaryRank(it EffectivenessSummaryItem) float64 {
	if it.CohensD == nil {
		return -1e9 + float64(it.NTotal)
	}
	return *it.CohensD
}

func groupOutcomesByIntervention(outcomes []*domain.Outcome) map[uuid.UUID][]*domain.Outcome {
	out := make(map[uuid.UUID][]*domain.Outcome)
	for _, o := range outcomes {
		out[o.InterventionID] = append(out[o.InterventionID], o)
	}
	return out
}

func buildSummaryItem(iv *domain.Intervention, outcomes []*domain.Outcome) EffectivenessSummaryItem {
	item := EffectivenessSummaryItem{
		InterventionID: iv.ID,
		Code:           iv.Code,
		TitleTR:        iv.TitleTR,
		Category:       iv.Category,
		EvidenceTier:   iv.EvidenceTier,
		NTotal:         len(outcomes),
		EffectCategory: "insufficient",
		Insufficient:   true,
	}
	if len(outcomes) == 0 {
		return item
	}

	pre := make([]float64, 0, len(outcomes))
	post := make([]float64, 0, len(outcomes))
	for _, o := range outcomes {
		if o.PreBATScore == nil || o.PostBATScore == nil {
			continue
		}
		pre = append(pre, *o.PreBATScore)
		post = append(post, *o.PostBATScore)
		if o.Success != nil && *o.Success {
			// Success recorded separately; count is just completed.
		}
	}
	item.NCompleted = len(pre)

	if len(pre) < stats.MinSampleSize {
		return item
	}

	d, low, high := stats.CohensDCI(pre, post)
	if math.IsNaN(d) {
		return item
	}
	_, p := stats.PairedTTest(pre, post)

	meanPre := meanOf(pre)
	meanPost := meanOf(post)
	drop := meanPost - meanPre // negative when burnout dropped

	item.CohensD = ptrFloat(d)
	item.CILow = ptrFloat(low)
	item.CIHigh = ptrFloat(high)
	item.PValue = ptrFloat(p)
	item.MeanPre = ptrFloat(meanPre)
	item.MeanPost = ptrFloat(meanPost)
	item.AvgBATDrop = ptrFloat(drop)
	item.EffectCategory = domain.EffectCategory(d)
	item.Insufficient = false
	return item
}

// OutcomeDetail is a sanitised per-employee entry for the drawer.
type OutcomeDetail struct {
	AssignmentID uuid.UUID  `json:"assignment_id"`
	EmployeeID   uuid.UUID  `json:"employee_id"`
	Pre          float64    `json:"pre_bat_score"`
	Post         float64    `json:"post_bat_score"`
	Delta        float64    `json:"delta"`
	Success      *bool      `json:"success,omitempty"`
	MeasuredAt   time.Time  `json:"measured_at"`
	HorizonWeeks *int       `json:"horizon_weeks,omitempty"`
}

// EffectivenessDetail is returned for the single-intervention drawer.
type EffectivenessDetail struct {
	Summary EffectivenessSummaryItem `json:"summary"`
	Trend   []TrendPoint             `json:"trend"`
	Entries []OutcomeDetail          `json:"entries"`
}

// GetDetail returns the detail payload (summary + 8-week trend + paired
// entries) for a single intervention. Caller must ensure tenant ownership via
// middleware.
func (s *EffectivenessService) GetDetail(ctx context.Context, tenantID, interventionID uuid.UUID, weeks int) (*EffectivenessDetail, error) {
	iv, err := s.catalog.GetByID(ctx, interventionID)
	if err != nil {
		return nil, err
	}
	if iv.TenantID != nil && *iv.TenantID != tenantID {
		return nil, domain.ErrForbidden
	}

	outcomes, err := s.outcomes.ListWithBothScores(ctx, interventionID)
	if err != nil {
		return nil, fmt.Errorf("list outcomes: %w", err)
	}

	detail := &EffectivenessDetail{
		Summary: buildSummaryItem(iv, outcomes),
		Entries: make([]OutcomeDetail, 0, len(outcomes)),
		Trend:   computeRollingTrend(outcomes, weeks),
	}
	for _, o := range outcomes {
		if o.PreBATScore == nil || o.PostBATScore == nil {
			continue
		}
		detail.Entries = append(detail.Entries, OutcomeDetail{
			AssignmentID: o.AssignmentID,
			EmployeeID:   o.EmployeeID,
			Pre:          *o.PreBATScore,
			Post:         *o.PostBATScore,
			Delta:        *o.PostBATScore - *o.PreBATScore,
			Success:      o.Success,
			MeasuredAt:   o.MeasuredAt,
			HorizonWeeks: o.HorizonWeeks,
		})
	}
	return detail, nil
}

// TrendPoint is a single weekly rolling Cohen's d sample.
type TrendPoint struct {
	WeekStart time.Time `json:"week_start"`
	N         int       `json:"n"`
	CohensD   *float64  `json:"cohens_d,omitempty"`
	CILow     *float64  `json:"ci_low,omitempty"`
	CIHigh    *float64  `json:"ci_high,omitempty"`
}

// TrendSeries groups weekly points by intervention for the multi-line chart.
type TrendSeries struct {
	InterventionID uuid.UUID    `json:"intervention_id"`
	Code           string       `json:"code"`
	TitleTR        string       `json:"title_tr"`
	Points         []TrendPoint `json:"points"`
}

// EffectivenessTrend is the payload for /effectiveness/trends.
type EffectivenessTrend struct {
	Weeks       int           `json:"weeks"`
	GeneratedAt time.Time     `json:"generated_at"`
	Series      []TrendSeries `json:"series"`
}

// GetTrends returns one time-series per catalog intervention for the last
// `weeks` weeks. Each point is the rolling Cohen's d over outcomes whose
// measured_at falls in [weekStart, weekStart + 7d); windows under
// stats.MinSampleSize carry nil d/CI.
func (s *EffectivenessService) GetTrends(ctx context.Context, tenantID uuid.UUID, weeks int) (*EffectivenessTrend, error) {
	if weeks <= 0 {
		weeks = 8
	}
	if weeks > 52 {
		weeks = 52
	}

	outcomes, err := s.outcomes.ListWithBothScoresByTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list tenant outcomes: %w", err)
	}
	grouped := groupOutcomesByIntervention(outcomes)

	interventions, err := s.catalog.ListActive(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	series := make([]TrendSeries, 0, len(grouped))
	for _, iv := range interventions {
		outs, ok := grouped[iv.ID]
		if !ok {
			continue
		}
		series = append(series, TrendSeries{
			InterventionID: iv.ID,
			Code:           iv.Code,
			TitleTR:        iv.TitleTR,
			Points:         computeRollingTrend(outs, weeks),
		})
	}

	return &EffectivenessTrend{
		Weeks:       weeks,
		GeneratedAt: time.Now().UTC(),
		Series:      series,
	}, nil
}

// computeRollingTrend buckets the outcomes into weekly windows ending "now"
// and computes Cohen's d + 95% CI per window. Weeks that do not meet
// MinSampleSize retain N but leave CohensD nil.
func computeRollingTrend(outcomes []*domain.Outcome, weeks int) []TrendPoint {
	if weeks <= 0 {
		weeks = 8
	}
	end := time.Now().UTC().Truncate(24 * time.Hour)
	// Anchor the last bucket to the current ISO-week Monday.
	weekday := int(end.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	anchor := end.AddDate(0, 0, -(weekday - 1))
	start := anchor.AddDate(0, 0, -7*(weeks-1))

	points := make([]TrendPoint, weeks)
	for i := 0; i < weeks; i++ {
		ws := start.AddDate(0, 0, 7*i)
		we := ws.AddDate(0, 0, 7)
		pre := make([]float64, 0, 16)
		post := make([]float64, 0, 16)
		for _, o := range outcomes {
			if o.PreBATScore == nil || o.PostBATScore == nil {
				continue
			}
			if o.MeasuredAt.Before(ws) || !o.MeasuredAt.Before(we) {
				continue
			}
			pre = append(pre, *o.PreBATScore)
			post = append(post, *o.PostBATScore)
		}
		p := TrendPoint{WeekStart: ws, N: len(pre)}
		if len(pre) >= stats.MinSampleSize {
			d, low, high := stats.CohensDCI(pre, post)
			if !math.IsNaN(d) {
				p.CohensD = ptrFloat(d)
				p.CILow = ptrFloat(low)
				p.CIHigh = ptrFloat(high)
			}
		}
		points[i] = p
	}
	return points
}

func meanOf(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	var s float64
	for _, v := range values {
		s += v
	}
	return s / float64(len(values))
}

func ptrFloat(v float64) *float64 { return &v }

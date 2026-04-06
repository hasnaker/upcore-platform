package service

import (
	"context"
	"fmt"

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

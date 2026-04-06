package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/bandit"
	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/repository"
)

// RecommenderService provides ranked intervention recommendations using
// Thompson sampling + evidence weighting.
type RecommenderService struct {
	catalog       repository.CatalogRepository
	effectiveness repository.EffectivenessRepository
	rng           *bandit.RNG
	defaultTopK   int
	log           zerolog.Logger
}

// NewRecommenderService constructs a RecommenderService.
func NewRecommenderService(
	catalog repository.CatalogRepository,
	effectiveness repository.EffectivenessRepository,
	defaultTopK int,
	log zerolog.Logger,
) *RecommenderService {
	return &RecommenderService{
		catalog:       catalog,
		effectiveness: effectiveness,
		rng:           bandit.NewRNG(),
		defaultTopK:   defaultTopK,
		log:           log.With().Str("component", "recommender_service").Logger(),
	}
}

// RecommendRequest is the input for a recommendation query.
type RecommendRequest struct {
	TenantID  uuid.UUID              `json:"tenant_id"`
	Dimension string                 `json:"dimension"`
	Segment   domain.RecommendSegment `json:"target_segment"`
	TopK      int                    `json:"top_k,omitempty"`
}

// Recommend returns ranked intervention recommendations.
func (s *RecommenderService) Recommend(ctx context.Context, req RecommendRequest) ([]domain.Recommendation, error) {
	topK := req.TopK
	if topK <= 0 {
		topK = s.defaultTopK
	}

	// Get active catalog entries
	catalog, err := s.catalog.ListActive(ctx, req.TenantID)
	if err != nil {
		return nil, err
	}

	// Filter by target dimension if specified
	if req.Dimension != "" {
		filtered := make([]*domain.Intervention, 0)
		for _, i := range catalog {
			for _, d := range i.TargetDrivers {
				if d == req.Dimension {
					filtered = append(filtered, i)
					break
				}
			}
		}
		if len(filtered) > 0 {
			catalog = filtered
		}
	}

	if len(catalog) == 0 {
		return []domain.Recommendation{}, nil
	}

	// Load posteriors
	posteriors := make(map[uuid.UUID]*domain.Posterior)
	for _, i := range catalog {
		p, err := s.effectiveness.GetByInterventionAndSegment(ctx, i.ID, "overall")
		if err == nil {
			posteriors[i.ID] = p
		}
	}

	// Build Thompson sampling arms
	arms := make([]bandit.Arm, len(catalog))
	for i, interv := range catalog {
		alpha := 2.0 // prior
		beta := 2.0
		if p, ok := posteriors[interv.ID]; ok {
			alpha = p.Alpha
			beta = p.Beta
		}
		arms[i] = bandit.Arm{
			ID:    interv.ID.String(),
			Alpha: alpha,
			Beta:  beta,
		}
	}

	// Sample
	samples := s.rng.ThompsonSampleValues(arms)
	sampleMap := make(map[uuid.UUID]float64)
	for i, interv := range catalog {
		sampleMap[interv.ID] = samples[i]
	}

	// Rank
	recs := domain.RankInterventions(catalog, posteriors, sampleMap, req.Segment)

	// Truncate to top-K
	if len(recs) > topK {
		recs = recs[:topK]
	}

	s.log.Info().
		Int("catalog_size", len(catalog)).
		Int("recommendations", len(recs)).
		Str("dimension", req.Dimension).
		Msg("recommendations generated")
	return recs, nil
}

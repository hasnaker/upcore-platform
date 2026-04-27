package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
	"github.com/upcore/mobility/internal/repository"
)

// SuccessionRepository is the persistence port used by SuccessionService.
// Defined here so tests can substitute an in-memory fake.
type SuccessionRepository interface {
	UpsertPlan(ctx context.Context, p *domain.SuccessionPlan) (*domain.SuccessionPlan, error)
	ListPlans(ctx context.Context, tenantID uuid.UUID) ([]domain.SuccessionPlan, error)
	GetPlanByID(ctx context.Context, tenantID, planID uuid.UUID) (*domain.SuccessionPlan, error)
	CandidatesForPlan(ctx context.Context, planID uuid.UUID) ([]domain.SuccessionCandidate, error)
	AddCandidate(ctx context.Context, c *domain.SuccessionCandidate) (*domain.SuccessionCandidate, error)
	CandidateCount(ctx context.Context, planID uuid.UUID) (int, error)
	CandidateDistinctPlanCount(ctx context.Context, tenantID, candidateEmployeeID uuid.UUID) (int, error)
	UpdateCandidateReadiness(ctx context.Context, candidateID uuid.UUID, readiness string, fitScore *float64, gapsTR *string, rank *int) (*domain.SuccessionCandidate, error)
	RemoveCandidate(ctx context.Context, tenantID, candidateID uuid.UUID) error
	ListCriticalPositions(ctx context.Context, tenantID uuid.UUID) ([]repository.CriticalPositionRow, error)
}

// Compile-time assertion: *repository.SuccessionRepo satisfies SuccessionRepository.
var _ SuccessionRepository = (*repository.SuccessionRepo)(nil)

// SuccessionService manages succession plans and candidates.
type SuccessionService struct {
	succession  SuccessionRepository
	poolMaxSize int
	logger      zerolog.Logger
}

func NewSuccessionService(
	succession SuccessionRepository,
	poolMaxSize int,
	logger zerolog.Logger,
) *SuccessionService {
	return &SuccessionService{succession: succession, poolMaxSize: poolMaxSize, logger: logger}
}

// UpsertPlanInput ensures a plan exists for a (tenant, position).
type UpsertPlanInput struct {
	TenantID       uuid.UUID
	PositionID     uuid.UUID
	IncumbentEmpID uuid.UUID
	RiskLevel      string
	CriticalityTR  string
}

func (s *SuccessionService) UpsertPlan(ctx context.Context, in UpsertPlanInput) (*domain.SuccessionPlan, error) {
	if in.PositionID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	p := &domain.SuccessionPlan{
		TenantID:       in.TenantID,
		PositionID:     in.PositionID,
		IncumbentEmpID: in.IncumbentEmpID,
		RiskLevel:      in.RiskLevel,
		CriticalityTR:  in.CriticalityTR,
	}
	return s.succession.UpsertPlan(ctx, p)
}

// ListPlans returns all plans for a tenant.
func (s *SuccessionService) ListPlans(ctx context.Context, tenantID uuid.UUID) ([]domain.SuccessionPlan, error) {
	return s.succession.ListPlans(ctx, tenantID)
}

// Candidates returns ranked candidates for a plan.
func (s *SuccessionService) Candidates(ctx context.Context, planID uuid.UUID) ([]domain.SuccessionCandidate, error) {
	return s.succession.CandidatesForPlan(ctx, planID)
}

// AddCandidateInput appends a candidate (pool-size enforced).
type AddCandidateInput struct {
	PlanID              uuid.UUID
	CandidateEmployeeID uuid.UUID
	Readiness           string
	FitScore            float64
	GapsTR              string
	Rank                int
}

// AddCandidate appends a candidate to a plan. Enforces:
//   - per-plan capacity (poolMaxSize),
//   - per-candidate distinct-plan cap (max 3 pools per candidate),
//   - duplicate (plan, candidate) pair (unique index).
func (s *SuccessionService) AddCandidate(
	ctx context.Context, tenantID uuid.UUID, in AddCandidateInput,
) (*domain.SuccessionCandidate, error) {
	if in.PlanID == uuid.Nil || in.CandidateEmployeeID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	if in.Readiness == "" {
		in.Readiness = domain.Readiness2Y
	}
	if !domain.ValidReadiness(in.Readiness) {
		return nil, domain.ErrSuccessionReadiness
	}
	if in.FitScore < 0 || in.FitScore > 100 {
		return nil, domain.ErrValidation
	}
	if in.Rank < 1 {
		in.Rank = 1
	}

	// Guard 1: per-plan pool capacity.
	n, err := s.succession.CandidateCount(ctx, in.PlanID)
	if err != nil {
		return nil, err
	}
	if n >= s.poolMaxSize {
		return nil, domain.ErrSuccessionPoolFull
	}

	// Guard 2: per-candidate distinct-plan cap (max 3 pools per candidate).
	if tenantID != uuid.Nil {
		poolsUsed, err := s.succession.CandidateDistinctPlanCount(ctx, tenantID, in.CandidateEmployeeID)
		if err != nil {
			return nil, err
		}
		if poolsUsed >= domain.SuccessionMaxPoolsPerCandidate {
			return nil, domain.ErrSuccessionMaxPools
		}
	}

	c := &domain.SuccessionCandidate{
		PlanID:              in.PlanID,
		CandidateEmployeeID: in.CandidateEmployeeID,
		Readiness:           in.Readiness,
		FitScore:            in.FitScore,
		GapsTR:              in.GapsTR,
		Rank:                in.Rank,
	}
	out, err := s.succession.AddCandidate(ctx, c)
	if err != nil {
		// Map DB-level pool/duplicate violations back to domain.
		msg := err.Error()
		switch {
		case strings.Contains(msg, "max 3 havuz"):
			return nil, domain.ErrSuccessionMaxPools
		case strings.Contains(msg, "duplicate key") &&
			strings.Contains(msg, "succession_candidates"):
			return nil, domain.ErrSuccessionDuplicate
		}
		return nil, err
	}
	return out, nil
}

// GetPlan returns a plan scoped to tenant.
func (s *SuccessionService) GetPlan(
	ctx context.Context, tenantID, planID uuid.UUID,
) (*domain.SuccessionPlan, error) {
	if planID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	return s.succession.GetPlanByID(ctx, tenantID, planID)
}

// UpdateReadinessInput changes readiness (+ optionally fit/gaps/rank).
type UpdateReadinessInput struct {
	CandidateID uuid.UUID
	Readiness   string
	FitScore    *float64
	GapsTR      *string
	Rank        *int
}

// UpdateReadiness mutates a candidate row.
func (s *SuccessionService) UpdateReadiness(
	ctx context.Context, in UpdateReadinessInput,
) (*domain.SuccessionCandidate, error) {
	if in.CandidateID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	if !domain.ValidReadiness(in.Readiness) {
		return nil, domain.ErrSuccessionReadiness
	}
	if in.FitScore != nil && (*in.FitScore < 0 || *in.FitScore > 100) {
		return nil, domain.ErrValidation
	}
	if in.Rank != nil && *in.Rank < 1 {
		return nil, domain.ErrValidation
	}
	return s.succession.UpdateCandidateReadiness(
		ctx, in.CandidateID, in.Readiness, in.FitScore, in.GapsTR, in.Rank,
	)
}

// RemoveCandidate deletes a candidate (tenant-scoped).
func (s *SuccessionService) RemoveCandidate(
	ctx context.Context, tenantID, candidateID uuid.UUID,
) error {
	if tenantID == uuid.Nil || candidateID == uuid.Nil {
		return domain.ErrValidation
	}
	return s.succession.RemoveCandidate(ctx, tenantID, candidateID)
}

// ListCriticalPositions returns the enriched list used by the UI.
func (s *SuccessionService) ListCriticalPositions(
	ctx context.Context, tenantID uuid.UUID,
) ([]repository.CriticalPositionRow, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	return s.succession.ListCriticalPositions(ctx, tenantID)
}

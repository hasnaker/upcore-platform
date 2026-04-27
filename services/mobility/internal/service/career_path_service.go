package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
	"github.com/upcore/mobility/internal/repository"
)

// CareerPathService handles career paths and steps.
type CareerPathService struct {
	paths  *repository.CareerPathRepo
	logger zerolog.Logger
}

func NewCareerPathService(paths *repository.CareerPathRepo, logger zerolog.Logger) *CareerPathService {
	return &CareerPathService{paths: paths, logger: logger}
}

// CreateInput creates a new (empty) career path.
type CreateInput struct {
	TenantID   uuid.UUID
	NameTR     string
	DescTR     string
	Discipline string
}

func (s *CareerPathService) Create(ctx context.Context, in CreateInput) (*domain.CareerPath, error) {
	if in.NameTR == "" || in.Discipline == "" {
		return nil, domain.ErrValidation
	}
	p := &domain.CareerPath{
		TenantID:   in.TenantID,
		NameTR:     in.NameTR,
		DescTR:     in.DescTR,
		Discipline: in.Discipline,
		IsActive:   true,
	}
	return s.paths.Create(ctx, p)
}

// List returns active career paths for a tenant (optionally filtered by discipline).
func (s *CareerPathService) List(ctx context.Context, tenantID uuid.UUID, discipline string) ([]domain.CareerPath, error) {
	return s.paths.ListActive(ctx, tenantID, discipline)
}

// Get loads a path with ordered steps.
func (s *CareerPathService) Get(ctx context.Context, tenantID, pathID uuid.UUID) (*domain.CareerPath, []domain.CareerPathStep, error) {
	return s.paths.GetWithSteps(ctx, tenantID, pathID)
}

// AddStepInput appends a step to an existing path.
type AddStepInput struct {
	PathID          uuid.UUID
	StepOrder       int
	PositionID      uuid.UUID
	TitleTR         string
	MinTenureMonths int
	CriteriaTR      string
}

func (s *CareerPathService) AddStep(ctx context.Context, in AddStepInput) (*domain.CareerPathStep, error) {
	if in.StepOrder < 0 || in.PositionID == uuid.Nil || in.TitleTR == "" {
		return nil, domain.ErrValidation
	}
	step := &domain.CareerPathStep{
		PathID:          in.PathID,
		StepOrder:       in.StepOrder,
		PositionID:      in.PositionID,
		TitleTR:         in.TitleTR,
		MinTenureMonths: in.MinTenureMonths,
		CriteriaTR:      in.CriteriaTR,
	}
	return s.paths.AddStep(ctx, step)
}

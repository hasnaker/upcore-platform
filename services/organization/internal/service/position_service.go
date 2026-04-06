package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/repository"
)

// PositionService manages position definitions and their JD-R profiles.
type PositionService struct {
	positions repository.PositionRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewPositionService creates a PositionService.
func NewPositionService(positions repository.PositionRepository, publisher event.Publisher, log zerolog.Logger) *PositionService {
	return &PositionService{positions: positions, publisher: publisher, log: log}
}

// CreatePositionInput captures POST /positions fields.
type CreatePositionInput struct {
	Code              string              `json:"code" validate:"required,min=2,max=60"`
	TitleTR           string              `json:"title_tr" validate:"required,min=1,max=200"`
	TitleEN           *string             `json:"title_en,omitempty" validate:"omitempty,max=200"`
	DepartmentID      *uuid.UUID          `json:"department_id,omitempty"`
	JobFamily         *string             `json:"job_family,omitempty" validate:"omitempty,max=80"`
	JobLevel          *string             `json:"job_level,omitempty"`
	SeniorityMinYears *int                `json:"seniority_min_years,omitempty" validate:"omitempty,gte=0"`
	DescriptionTR     *string             `json:"description_tr,omitempty"`
	DescriptionEN     *string             `json:"description_en,omitempty"`
	SalaryBandMin     *float64            `json:"salary_band_min,omitempty" validate:"omitempty,gte=0"`
	SalaryBandMax     *float64            `json:"salary_band_max,omitempty" validate:"omitempty,gte=0"`
	SalaryCurrency    string              `json:"salary_currency,omitempty" validate:"omitempty,len=3"`
	EmploymentType    domain.EmploymentType `json:"employment_type,omitempty"`
	RemotePolicy      domain.RemotePolicy   `json:"remote_policy,omitempty"`
	Demands           domain.JDRDemands   `json:"jdr_talepler"`
	Resources         domain.JDRResources `json:"jdr_kaynaklar"`
}

// UpdatePositionInput captures patchable fields.
type UpdatePositionInput struct {
	TitleTR           *string             `json:"title_tr,omitempty" validate:"omitempty,min=1,max=200"`
	TitleEN           *string             `json:"title_en,omitempty" validate:"omitempty,max=200"`
	DepartmentID      *uuid.UUID          `json:"department_id,omitempty"`
	JobFamily         *string             `json:"job_family,omitempty" validate:"omitempty,max=80"`
	JobLevel          *string             `json:"job_level,omitempty"`
	SeniorityMinYears *int                `json:"seniority_min_years,omitempty" validate:"omitempty,gte=0"`
	DescriptionTR     *string             `json:"description_tr,omitempty"`
	DescriptionEN     *string             `json:"description_en,omitempty"`
	SalaryBandMin     *float64            `json:"salary_band_min,omitempty"`
	SalaryBandMax     *float64            `json:"salary_band_max,omitempty"`
	SalaryCurrency    *string             `json:"salary_currency,omitempty"`
	EmploymentType    *domain.EmploymentType `json:"employment_type,omitempty"`
	RemotePolicy      *domain.RemotePolicy   `json:"remote_policy,omitempty"`
	Active            *bool               `json:"active,omitempty"`
}

// Create persists a new position.
func (s *PositionService) Create(ctx context.Context, tenantID uuid.UUID, in CreatePositionInput) (*domain.Position, error) {
	code := strings.ToLower(strings.TrimSpace(in.Code))
	title := strings.TrimSpace(in.TitleTR)
	if title == "" {
		return nil, domain.NewValidationError(map[string]string{"title_tr": "required"})
	}
	if err := domain.ValidateCode(code); err != nil {
		return nil, domain.NewValidationError(map[string]string{"code": "invalid format"})
	}
	currency := strings.ToUpper(strings.TrimSpace(in.SalaryCurrency))
	if currency == "" {
		currency = "TRY"
	}
	empType := in.EmploymentType
	if empType == "" {
		empType = domain.EmploymentFullTime
	}
	policy := in.RemotePolicy
	if policy == "" {
		policy = domain.RemoteHybrid
	}

	now := time.Now().UTC()
	p := &domain.Position{
		ID:                uuid.New(),
		TenantID:          tenantID,
		DepartmentID:      in.DepartmentID,
		Code:              code,
		TitleTR:           title,
		TitleEN:           in.TitleEN,
		JobFamily:         in.JobFamily,
		JobLevel:          in.JobLevel,
		SeniorityMinYears: in.SeniorityMinYears,
		DescriptionTR:     in.DescriptionTR,
		DescriptionEN:     in.DescriptionEN,
		Responsibilities:  domain.JSONB("[]"),
		RequiredSkills:    domain.JSONB("[]"),
		PreferredSkills:   domain.JSONB("[]"),
		JDRDemands:        in.Demands,
		JDRResources:      in.Resources,
		SalaryBandMin:     in.SalaryBandMin,
		SalaryBandMax:     in.SalaryBandMax,
		SalaryCurrency:    currency,
		EmploymentType:    empType,
		RemotePolicy:      policy,
		Active:            true,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := p.Validate(); err != nil {
		return nil, err
	}
	if err := s.positions.Create(ctx, nil, p); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicPositionCreated, map[string]any{
		"position_id":   p.ID,
		"tenant_id":     p.TenantID,
		"title":         p.TitleTR,
		"department_id": p.DepartmentID,
		"job_level":     p.JobLevel,
	})
	return p, nil
}

// Get fetches a position by ID.
func (s *PositionService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Position, error) {
	return s.positions.GetByID(ctx, tenantID, id)
}

// List returns positions matching the filter.
func (s *PositionService) List(ctx context.Context, tenantID uuid.UUID, f repository.PositionFilter) ([]*domain.Position, int, error) {
	return s.positions.List(ctx, tenantID, f)
}

// Update applies partial field changes.
func (s *PositionService) Update(ctx context.Context, tenantID, id uuid.UUID, in UpdatePositionInput) (*domain.Position, error) {
	p, err := s.positions.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if in.TitleTR != nil {
		if strings.TrimSpace(*in.TitleTR) == "" {
			return nil, domain.NewValidationError(map[string]string{"title_tr": "required"})
		}
		p.TitleTR = strings.TrimSpace(*in.TitleTR)
	}
	if in.TitleEN != nil {
		p.TitleEN = in.TitleEN
	}
	if in.DepartmentID != nil {
		p.DepartmentID = in.DepartmentID
	}
	if in.JobFamily != nil {
		p.JobFamily = in.JobFamily
	}
	if in.JobLevel != nil {
		if *in.JobLevel != "" && !domain.IsValidLevel(*in.JobLevel) {
			return nil, domain.NewValidationError(map[string]string{"job_level": "invalid"})
		}
		p.JobLevel = in.JobLevel
	}
	if in.SeniorityMinYears != nil {
		p.SeniorityMinYears = in.SeniorityMinYears
	}
	if in.DescriptionTR != nil {
		p.DescriptionTR = in.DescriptionTR
	}
	if in.DescriptionEN != nil {
		p.DescriptionEN = in.DescriptionEN
	}
	if in.SalaryBandMin != nil {
		p.SalaryBandMin = in.SalaryBandMin
	}
	if in.SalaryBandMax != nil {
		p.SalaryBandMax = in.SalaryBandMax
	}
	if in.SalaryCurrency != nil {
		c := strings.ToUpper(strings.TrimSpace(*in.SalaryCurrency))
		if len(c) != 3 {
			return nil, domain.NewValidationError(map[string]string{"salary_currency": "must be ISO 4217"})
		}
		p.SalaryCurrency = c
	}
	if in.EmploymentType != nil {
		p.EmploymentType = *in.EmploymentType
	}
	if in.RemotePolicy != nil {
		p.RemotePolicy = *in.RemotePolicy
	}
	if in.Active != nil {
		p.Active = *in.Active
	}
	if err := p.Validate(); err != nil {
		return nil, err
	}
	if err := s.positions.Update(ctx, nil, p); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicPositionUpdated, map[string]any{
		"position_id": p.ID,
		"tenant_id":   p.TenantID,
		"updated_at":  p.UpdatedAt,
	})
	return p, nil
}

// UpdateJDR replaces the JD-R profile.
func (s *PositionService) UpdateJDR(ctx context.Context, tenantID, id uuid.UUID, demands domain.JDRDemands, resources domain.JDRResources) (*domain.Position, error) {
	if err := demands.Validate(); err != nil {
		return nil, domain.NewValidationError(map[string]string{"jdr_talepler": err.Error()})
	}
	if err := resources.Validate(); err != nil {
		return nil, domain.NewValidationError(map[string]string{"jdr_kaynaklar": err.Error()})
	}
	if err := s.positions.UpdateJDR(ctx, nil, tenantID, id, demands, resources); err != nil {
		return nil, err
	}
	p, err := s.positions.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicPositionJDRChanged, map[string]any{
		"position_id":    p.ID,
		"tenant_id":      p.TenantID,
		"demand_score":   demands.DemandScore(),
		"resource_score": resources.ResourceScore(),
	})
	return p, nil
}

// Archive soft-deletes a position.
func (s *PositionService) Archive(ctx context.Context, tenantID, id uuid.UUID) error {
	if err := s.positions.Archive(ctx, tenantID, id); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicPositionDeleted, map[string]any{
		"position_id": id,
		"tenant_id":   tenantID,
		"deleted_at":  time.Now().UTC(),
	})
	return nil
}

// GetSalaryBand returns the min/max salary band for a position.
func (s *PositionService) GetSalaryBand(ctx context.Context, tenantID, id uuid.UUID) (*float64, *float64, error) {
	p, err := s.positions.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, nil, err
	}
	return p.SalaryBandMin, p.SalaryBandMax, nil
}

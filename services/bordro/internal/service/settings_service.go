package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/domain"
	"github.com/upcore/bordrosvc/internal/repository"
)

// SettingsService manages tenant bordro settings.
type SettingsService struct {
	repo repository.SettingsRepository
}

// NewSettingsService constructs the service.
func NewSettingsService(repo repository.SettingsRepository) *SettingsService {
	return &SettingsService{repo: repo}
}

// SettingsRequest is the PUT body.
type SettingsRequest struct {
	HoursPerMonth         *float64 `json:"hours_per_month,omitempty"`
	MealDailyGross        *float64 `json:"meal_daily_gross,omitempty"`
	MealExemptDaily       *float64 `json:"meal_exempt_daily,omitempty"`
	TransportDailyGross   *float64 `json:"transport_daily_gross,omitempty"`
	TransportExemptDaily  *float64 `json:"transport_exempt_daily,omitempty"`
	KidemYearlyCap        *float64 `json:"kidem_yearly_cap,omitempty"`
	ApplyMinWageExemption *bool    `json:"apply_min_wage_exemption,omitempty"`
	OvertimeYTDResetMonth *int16   `json:"overtime_ytd_reset_month,omitempty"`
}

// Get returns the tenant's settings (defaults if not set).
func (s *SettingsService) Get(ctx context.Context, tenantID uuid.UUID) (*domain.BordroSettings, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	return s.repo.GetOrDefault(ctx, tenantID)
}

// Upsert merges partial updates atop existing row.
func (s *SettingsService) Upsert(ctx context.Context, tenantID uuid.UUID, req SettingsRequest) (*domain.BordroSettings, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	existing, err := s.repo.GetOrDefault(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	existing.TenantID = tenantID
	if req.HoursPerMonth != nil {
		existing.HoursPerMonth = *req.HoursPerMonth
	}
	if req.MealDailyGross != nil {
		existing.MealDailyGross = *req.MealDailyGross
	}
	if req.MealExemptDaily != nil {
		existing.MealExemptDaily = *req.MealExemptDaily
	}
	if req.TransportDailyGross != nil {
		existing.TransportDailyGross = *req.TransportDailyGross
	}
	if req.TransportExemptDaily != nil {
		existing.TransportExemptDaily = *req.TransportExemptDaily
	}
	if req.KidemYearlyCap != nil {
		existing.KidemYearlyCap = req.KidemYearlyCap
	}
	if req.ApplyMinWageExemption != nil {
		existing.ApplyMinWageExemption = *req.ApplyMinWageExemption
	}
	if req.OvertimeYTDResetMonth != nil {
		existing.OvertimeYTDResetMonth = *req.OvertimeYTDResetMonth
	}
	if err := existing.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Upsert(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

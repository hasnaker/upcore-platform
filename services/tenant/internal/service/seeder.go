package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/repository"
)

// Seeder bootstraps default resources for a newly created tenant.
type Seeder struct {
	usage repository.UsageRepository
}

// NewSeeder creates a new seeder.
func NewSeeder(usage repository.UsageRepository) *Seeder {
	return &Seeder{usage: usage}
}

// SeedDefaults initializes zero-value usage counters for the current period.
// It is idempotent — usage_counters uses ON CONFLICT DO UPDATE with +delta, but
// seeding uses delta=0 so re-runs leave counters untouched.
func (s *Seeder) SeedDefaults(ctx context.Context, tenantID uuid.UUID) error {
	if s == nil || s.usage == nil {
		return nil
	}
	now := time.Now().UTC()
	metrics := []domain.Metric{
		domain.MetricEmployees,
		domain.MetricAssessments,
		domain.MetricStorageMB,
		domain.MetricAPICalls,
	}
	for _, m := range metrics {
		if err := s.usage.Increment(ctx, tenantID, m, 0, now); err != nil {
			return err
		}
	}
	return nil
}

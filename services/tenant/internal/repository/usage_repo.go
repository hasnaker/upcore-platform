package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/tenant/internal/db"
	"github.com/upcore/tenant/internal/domain"
)

// UsageRepository persists usage counters.
type UsageRepository interface {
	Increment(ctx context.Context, tenantID uuid.UUID, metric domain.Metric, delta int64, period time.Time) error
	Get(ctx context.Context, tenantID uuid.UUID, metric domain.Metric, period time.Time) (*domain.UsageCounter, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, period time.Time) ([]*domain.UsageCounter, error)
}

type usageRepo struct {
	db *sqlx.DB
}

// NewUsageRepository creates a usage repository.
func NewUsageRepository(d *sqlx.DB) UsageRepository {
	return &usageRepo{db: d}
}

func (r *usageRepo) Increment(ctx context.Context, tenantID uuid.UUID, metric domain.Metric, delta int64, period time.Time) error {
	start, end := domain.CurrentPeriod(period)
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, db.QUpsertUsage, tenantID, string(metric), delta, start, end, now)
	if err != nil {
		return fmt.Errorf("upsert usage: %w", err)
	}
	return nil
}

func (r *usageRepo) Get(ctx context.Context, tenantID uuid.UUID, metric domain.Metric, period time.Time) (*domain.UsageCounter, error) {
	start, _ := domain.CurrentPeriod(period)
	var u domain.UsageCounter
	if err := r.db.GetContext(ctx, &u, db.QGetUsage, tenantID, string(metric), start); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Return zero counter instead of 404 — usage may not have been tracked yet.
			_, endT := domain.CurrentPeriod(period)
			return &domain.UsageCounter{
				TenantID:    tenantID,
				Metric:      metric,
				Value:       0,
				PeriodStart: start,
				PeriodEnd:   endT,
				UpdatedAt:   time.Now().UTC(),
			}, nil
		}
		return nil, fmt.Errorf("select usage: %w", err)
	}
	return &u, nil
}

func (r *usageRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, period time.Time) ([]*domain.UsageCounter, error) {
	start, _ := domain.CurrentPeriod(period)
	var us []*domain.UsageCounter
	if err := r.db.SelectContext(ctx, &us, db.QListUsageByTenant, tenantID, start); err != nil {
		return nil, fmt.Errorf("list usage: %w", err)
	}
	return us, nil
}

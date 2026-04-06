package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jmoiron/sqlx"

	"github.com/upcore/tenant/internal/db"
	"github.com/upcore/tenant/internal/domain"
)

// PlanRepository persists plan catalog records.
type PlanRepository interface {
	GetByID(ctx context.Context, id string) (*domain.Plan, error)
	ListActive(ctx context.Context) ([]*domain.Plan, error)
}

type planRepo struct {
	db *sqlx.DB
}

// NewPlanRepository creates a new plan repository.
func NewPlanRepository(d *sqlx.DB) PlanRepository {
	return &planRepo{db: d}
}

func (r *planRepo) GetByID(ctx context.Context, id string) (*domain.Plan, error) {
	var p domain.Plan
	if err := r.db.GetContext(ctx, &p, db.QSelectPlanByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrPlanNotFound
		}
		return nil, fmt.Errorf("select plan: %w", err)
	}
	return &p, nil
}

func (r *planRepo) ListActive(ctx context.Context) ([]*domain.Plan, error) {
	var ps []*domain.Plan
	if err := r.db.SelectContext(ctx, &ps, db.QListActivePlans); err != nil {
		return nil, fmt.Errorf("list plans: %w", err)
	}
	return ps, nil
}

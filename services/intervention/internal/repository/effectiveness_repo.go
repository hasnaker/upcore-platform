package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/intervention/internal/domain"
)

// EffectivenessRepository abstracts persistence for effectiveness posteriors.
type EffectivenessRepository interface {
	Upsert(ctx context.Context, p *domain.Posterior) error
	GetByInterventionAndSegment(ctx context.Context, interventionID uuid.UUID, segment string) (*domain.Posterior, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.Posterior, error)
	ListByIntervention(ctx context.Context, interventionID uuid.UUID) ([]*domain.Posterior, error)
}

type effectivenessRepo struct {
	db *sqlx.DB
}

// NewEffectivenessRepository constructs an EffectivenessRepository backed by sqlx.
func NewEffectivenessRepository(db *sqlx.DB) EffectivenessRepository {
	return &effectivenessRepo{db: db}
}

func (r *effectivenessRepo) Upsert(ctx context.Context, p *domain.Posterior) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now().UTC()
	p.LastUpdatedAt = now
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}

	q := `INSERT INTO ml.effectiveness_posteriors (
		id, tenant_id, intervention_id, segment, alpha, beta,
		n_observations, mean_effect, last_updated_at, created_at
	) VALUES (
		:id, :tenant_id, :intervention_id, :segment, :alpha, :beta,
		:n_observations, :mean_effect, :last_updated_at, :created_at
	)
	ON CONFLICT (intervention_id, segment) DO UPDATE SET
		alpha = EXCLUDED.alpha, beta = EXCLUDED.beta,
		n_observations = EXCLUDED.n_observations,
		mean_effect = EXCLUDED.mean_effect,
		last_updated_at = EXCLUDED.last_updated_at`
	_, err := r.db.NamedExecContext(ctx, q, p)
	if err != nil {
		return fmt.Errorf("upsert posterior: %w", err)
	}
	return nil
}

func (r *effectivenessRepo) GetByInterventionAndSegment(ctx context.Context, interventionID uuid.UUID, segment string) (*domain.Posterior, error) {
	var p domain.Posterior
	q := `SELECT * FROM ml.effectiveness_posteriors
		WHERE intervention_id = $1 AND segment = $2`
	if err := r.db.GetContext(ctx, &p, q, interventionID, segment); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrPosteriorNotFound
		}
		return nil, fmt.Errorf("select posterior: %w", err)
	}
	return &p, nil
}

func (r *effectivenessRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.Posterior, error) {
	var rows []*domain.Posterior
	q := `SELECT * FROM ml.effectiveness_posteriors
		WHERE tenant_id = $1 OR tenant_id IS NULL
		ORDER BY intervention_id, segment`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID); err != nil {
		return nil, fmt.Errorf("list posteriors: %w", err)
	}
	return rows, nil
}

func (r *effectivenessRepo) ListByIntervention(ctx context.Context, interventionID uuid.UUID) ([]*domain.Posterior, error) {
	var rows []*domain.Posterior
	q := `SELECT * FROM ml.effectiveness_posteriors
		WHERE intervention_id = $1
		ORDER BY segment`
	if err := r.db.SelectContext(ctx, &rows, q, interventionID); err != nil {
		return nil, fmt.Errorf("list by intervention: %w", err)
	}
	return rows, nil
}

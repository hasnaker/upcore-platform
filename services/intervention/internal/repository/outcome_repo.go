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

// OutcomeRepository abstracts persistence for intervention outcomes.
type OutcomeRepository interface {
	Upsert(ctx context.Context, o *domain.Outcome) error
	GetByAssignment(ctx context.Context, assignmentID uuid.UUID) (*domain.Outcome, error)
	ListByIntervention(ctx context.Context, interventionID uuid.UUID) ([]*domain.Outcome, error)
	ListWithBothScores(ctx context.Context, interventionID uuid.UUID) ([]*domain.Outcome, error)
	ListWithBothScoresByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.Outcome, error)
}

type outcomeRepo struct {
	db *sqlx.DB
}

// NewOutcomeRepository constructs an OutcomeRepository backed by sqlx.
func NewOutcomeRepository(db *sqlx.DB) OutcomeRepository {
	return &outcomeRepo{db: db}
}

func (r *outcomeRepo) Upsert(ctx context.Context, o *domain.Outcome) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	now := time.Now().UTC()
	o.CreatedAt = now
	o.UpdatedAt = now

	q := `INSERT INTO app.intervention_outcomes (
		id, tenant_id, assignment_id, intervention_id, employee_id,
		pre_bat_score, post_bat_score, effect_size,
		pre_assessment_id, post_assessment_id,
		success, measured_at, horizon_weeks, notes, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :assignment_id, :intervention_id, :employee_id,
		:pre_bat_score, :post_bat_score, :effect_size,
		:pre_assessment_id, :post_assessment_id,
		:success, :measured_at, :horizon_weeks, :notes, :created_at, :updated_at
	)
	ON CONFLICT (assignment_id) DO UPDATE SET
		post_bat_score = EXCLUDED.post_bat_score,
		effect_size = EXCLUDED.effect_size,
		post_assessment_id = EXCLUDED.post_assessment_id,
		success = EXCLUDED.success,
		measured_at = EXCLUDED.measured_at,
		notes = EXCLUDED.notes,
		updated_at = EXCLUDED.updated_at`
	_, err := r.db.NamedExecContext(ctx, q, o)
	if err != nil {
		return fmt.Errorf("upsert outcome: %w", err)
	}
	return nil
}

func (r *outcomeRepo) GetByAssignment(ctx context.Context, assignmentID uuid.UUID) (*domain.Outcome, error) {
	var o domain.Outcome
	q := `SELECT * FROM app.intervention_outcomes WHERE assignment_id = $1`
	if err := r.db.GetContext(ctx, &o, q, assignmentID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOutcomeNotFound
		}
		return nil, fmt.Errorf("select outcome: %w", err)
	}
	return &o, nil
}

func (r *outcomeRepo) ListByIntervention(ctx context.Context, interventionID uuid.UUID) ([]*domain.Outcome, error) {
	var rows []*domain.Outcome
	q := `SELECT * FROM app.intervention_outcomes
		WHERE intervention_id = $1
		ORDER BY measured_at DESC`
	if err := r.db.SelectContext(ctx, &rows, q, interventionID); err != nil {
		return nil, fmt.Errorf("list outcomes: %w", err)
	}
	return rows, nil
}

func (r *outcomeRepo) ListWithBothScores(ctx context.Context, interventionID uuid.UUID) ([]*domain.Outcome, error) {
	var rows []*domain.Outcome
	q := `SELECT * FROM app.intervention_outcomes
		WHERE intervention_id = $1
		  AND pre_bat_score IS NOT NULL
		  AND post_bat_score IS NOT NULL
		ORDER BY measured_at DESC`
	if err := r.db.SelectContext(ctx, &rows, q, interventionID); err != nil {
		return nil, fmt.Errorf("list outcomes with both scores: %w", err)
	}
	return rows, nil
}

// ListWithBothScoresByTenant returns every outcome for the tenant that has
// both pre and post BAT scores recorded, across all interventions. Used by
// the effectiveness summary and trend endpoints.
func (r *outcomeRepo) ListWithBothScoresByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.Outcome, error) {
	var rows []*domain.Outcome
	q := `SELECT * FROM app.intervention_outcomes
		WHERE tenant_id = $1
		  AND pre_bat_score IS NOT NULL
		  AND post_bat_score IS NOT NULL
		ORDER BY intervention_id, measured_at ASC`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID); err != nil {
		return nil, fmt.Errorf("list tenant outcomes: %w", err)
	}
	return rows, nil
}

package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/survey/internal/domain"
)

// AggregateRepository abstracts persistence for survey aggregates.
type AggregateRepository interface {
	Upsert(ctx context.Context, a *domain.Aggregate) error
	ListByDistribution(ctx context.Context, distributionID uuid.UUID) ([]*domain.Aggregate, error)
	ListByDimension(ctx context.Context, tenantID uuid.UUID, dimension string, limit int) ([]*domain.Aggregate, error)
	GetTrend(ctx context.Context, tenantID uuid.UUID, surveyCode string, segType domain.SegType, segKey, dimension string, periods int) ([]*domain.Aggregate, error)
}

type aggregateRepo struct {
	db *sqlx.DB
}

// NewAggregateRepository constructs an AggregateRepository backed by sqlx.
func NewAggregateRepository(db *sqlx.DB) AggregateRepository {
	return &aggregateRepo{db: db}
}

func (r *aggregateRepo) Upsert(ctx context.Context, a *domain.Aggregate) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	a.ComputedAt = time.Now().UTC()

	q := `INSERT INTO app.survey_aggregates (
		id, tenant_id, distribution_id, segment_type, segment_key,
		dimension, mean, stddev, n, z_score, percentile, computed_at
	) VALUES (
		:id, :tenant_id, :distribution_id, :segment_type, :segment_key,
		:dimension, :mean, :stddev, :n, :z_score, :percentile, :computed_at
	)
	ON CONFLICT (distribution_id, segment_type, segment_key, dimension)
	DO UPDATE SET mean = EXCLUDED.mean, stddev = EXCLUDED.stddev, n = EXCLUDED.n,
		z_score = EXCLUDED.z_score, percentile = EXCLUDED.percentile,
		computed_at = EXCLUDED.computed_at`
	_, err := r.db.NamedExecContext(ctx, q, a)
	if err != nil {
		return fmt.Errorf("upsert aggregate: %w", err)
	}
	return nil
}

func (r *aggregateRepo) ListByDistribution(ctx context.Context, distributionID uuid.UUID) ([]*domain.Aggregate, error) {
	var rows []*domain.Aggregate
	q := `SELECT * FROM app.survey_aggregates WHERE distribution_id = $1 ORDER BY segment_type, segment_key, dimension`
	if err := r.db.SelectContext(ctx, &rows, q, distributionID); err != nil {
		return nil, fmt.Errorf("list aggregates: %w", err)
	}
	return rows, nil
}

func (r *aggregateRepo) ListByDimension(ctx context.Context, tenantID uuid.UUID, dimension string, limit int) ([]*domain.Aggregate, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var rows []*domain.Aggregate
	q := `SELECT * FROM app.survey_aggregates
		WHERE tenant_id = $1 AND dimension = $2
		ORDER BY computed_at DESC
		LIMIT $3`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, dimension, limit); err != nil {
		return nil, fmt.Errorf("list by dimension: %w", err)
	}
	return rows, nil
}

func (r *aggregateRepo) GetTrend(ctx context.Context, tenantID uuid.UUID, surveyCode string, segType domain.SegType, segKey, dimension string, periods int) ([]*domain.Aggregate, error) {
	if periods <= 0 {
		periods = 12
	}
	var rows []*domain.Aggregate
	q := `SELECT a.* FROM app.survey_aggregates a
		JOIN app.survey_distributions d ON a.distribution_id = d.id
		JOIN app.surveys s ON d.survey_id = s.id
		WHERE a.tenant_id = $1 AND s.survey_type = $2
		  AND a.segment_type = $3 AND a.segment_key = $4
		  AND a.dimension = $5
		ORDER BY a.computed_at DESC
		LIMIT $6`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, surveyCode, string(segType), segKey, dimension, periods); err != nil {
		return nil, fmt.Errorf("get trend: %w", err)
	}
	return rows, nil
}

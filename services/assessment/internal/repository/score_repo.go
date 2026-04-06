package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/assessment/internal/db"
	"github.com/upcore/assessment/internal/domain"
)

// ScoreRepository abstracts persistence for assessment scores.
type ScoreRepository interface {
	Create(ctx context.Context, s *domain.Score) error
	BulkCreate(ctx context.Context, scores []*domain.Score) (int, error)
	ListByAssessment(ctx context.Context, assessmentID uuid.UUID) ([]*domain.Score, error)
	DeleteByAssessment(ctx context.Context, assessmentID uuid.UUID) error
}

type scoreRepo struct {
	db *sqlx.DB
}

// NewScoreRepository constructs a ScoreRepository backed by sqlx.
func NewScoreRepository(d *sqlx.DB) ScoreRepository {
	return &scoreRepo{db: d}
}

// Create inserts a score.
func (r *scoreRepo) Create(ctx context.Context, s *domain.Score) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.CreatedAt.IsZero() {
		s.CreatedAt = time.Now().UTC()
	}
	if s.ScoredAt.IsZero() {
		s.ScoredAt = time.Now().UTC()
	}
	if len(s.Metadata) == 0 {
		s.Metadata = domain.JSONB("{}")
	}

	_, err := r.db.NamedExecContext(ctx, db.QInsertScore, s)
	if err != nil {
		return fmt.Errorf("insert score: %w", err)
	}
	return nil
}

// BulkCreate inserts multiple scores. Returns count of inserted rows.
func (r *scoreRepo) BulkCreate(ctx context.Context, scores []*domain.Score) (int, error) {
	if len(scores) == 0 {
		return 0, nil
	}
	inserted := 0
	for _, s := range scores {
		if err := r.Create(ctx, s); err != nil {
			return inserted, err
		}
		inserted++
	}
	return inserted, nil
}

// ListByAssessment returns all scores for an assessment.
func (r *scoreRepo) ListByAssessment(ctx context.Context, assessmentID uuid.UUID) ([]*domain.Score, error) {
	var scores []*domain.Score
	if err := r.db.SelectContext(ctx, &scores, db.QSelectScoresByAssessment, assessmentID); err != nil {
		return nil, fmt.Errorf("list scores: %w", err)
	}
	if scores == nil {
		scores = []*domain.Score{}
	}
	return scores, nil
}

// DeleteByAssessment removes all scores for an assessment (for re-scoring).
func (r *scoreRepo) DeleteByAssessment(ctx context.Context, assessmentID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, db.QDeleteScoresByAssessment, assessmentID)
	if err != nil {
		return fmt.Errorf("delete scores: %w", err)
	}
	return nil
}

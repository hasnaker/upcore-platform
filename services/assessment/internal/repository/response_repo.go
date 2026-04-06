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

// ResponseRepository abstracts persistence for assessment responses.
type ResponseRepository interface {
	Create(ctx context.Context, r *domain.Response) error
	BulkCreate(ctx context.Context, responses []*domain.Response) (int, error)
	ListByAssessment(ctx context.Context, assessmentID uuid.UUID) ([]*domain.Response, error)
	ListBySession(ctx context.Context, sessionID uuid.UUID) ([]*domain.Response, error)
	CountByAssessment(ctx context.Context, assessmentID uuid.UUID) (int, error)
}

type responseRepo struct {
	db *sqlx.DB
}

// NewResponseRepository constructs a ResponseRepository backed by sqlx.
func NewResponseRepository(d *sqlx.DB) ResponseRepository {
	return &responseRepo{db: d}
}

// Create inserts a response.
func (r *responseRepo) Create(ctx context.Context, resp *domain.Response) error {
	if resp.ID == uuid.Nil {
		resp.ID = uuid.New()
	}
	if resp.CreatedAt.IsZero() {
		resp.CreatedAt = time.Now().UTC()
	}

	_, err := r.db.NamedExecContext(ctx, db.QInsertResponse, resp)
	if err != nil {
		return fmt.Errorf("insert response: %w", err)
	}
	return nil
}

// BulkCreate inserts multiple responses. Returns count of inserted rows.
func (r *responseRepo) BulkCreate(ctx context.Context, responses []*domain.Response) (int, error) {
	if len(responses) == 0 {
		return 0, nil
	}
	inserted := 0
	for _, resp := range responses {
		if err := r.Create(ctx, resp); err != nil {
			return inserted, err
		}
		inserted++
	}
	return inserted, nil
}

// ListByAssessment returns all responses for an assessment.
func (r *responseRepo) ListByAssessment(ctx context.Context, assessmentID uuid.UUID) ([]*domain.Response, error) {
	var responses []*domain.Response
	if err := r.db.SelectContext(ctx, &responses, db.QSelectResponsesByAssessment, assessmentID); err != nil {
		return nil, fmt.Errorf("list responses: %w", err)
	}
	if responses == nil {
		responses = []*domain.Response{}
	}
	return responses, nil
}

// ListBySession returns all responses for a session.
func (r *responseRepo) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]*domain.Response, error) {
	var responses []*domain.Response
	if err := r.db.SelectContext(ctx, &responses, db.QSelectResponsesBySession, sessionID); err != nil {
		return nil, fmt.Errorf("list responses by session: %w", err)
	}
	if responses == nil {
		responses = []*domain.Response{}
	}
	return responses, nil
}

// CountByAssessment returns the count of responses for an assessment.
func (r *responseRepo) CountByAssessment(ctx context.Context, assessmentID uuid.UUID) (int, error) {
	var count int
	q := `SELECT COUNT(*) FROM app.assessment_responses WHERE assessment_id = $1`
	if err := r.db.GetContext(ctx, &count, q, assessmentID); err != nil {
		return 0, fmt.Errorf("count responses: %w", err)
	}
	return count, nil
}

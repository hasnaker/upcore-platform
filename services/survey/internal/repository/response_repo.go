package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/survey/internal/domain"
)

// ResponseRepository abstracts persistence for survey responses.
type ResponseRepository interface {
	Create(ctx context.Context, r *domain.Response) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Response, error)
	CountByDistribution(ctx context.Context, distributionID uuid.UUID) (int, error)
	ListByDistribution(ctx context.Context, distributionID uuid.UUID) ([]*domain.Response, error)
}

type responseRepo struct {
	db *sqlx.DB
}

// NewResponseRepository constructs a ResponseRepository backed by sqlx.
func NewResponseRepository(db *sqlx.DB) ResponseRepository {
	return &responseRepo{db: db}
}

func (r *responseRepo) Create(ctx context.Context, resp *domain.Response) error {
	if resp.ID == uuid.Nil {
		resp.ID = uuid.New()
	}
	now := time.Now().UTC()
	resp.CompletedAt = now
	resp.CreatedAt = now

	q := `INSERT INTO app.survey_responses (
		id, tenant_id, survey_id, invitation_id, employee_id, assessment_id,
		responses, comment_tr, completed_at, duration_seconds, locale, created_at
	) VALUES (
		:id, :tenant_id, :survey_id, :invitation_id, :employee_id, :assessment_id,
		:responses, :comment_tr, :completed_at, :duration_seconds, :locale, :created_at
	)`
	_, err := r.db.NamedExecContext(ctx, q, resp)
	if err != nil {
		return fmt.Errorf("insert response: %w", err)
	}
	return nil
}

func (r *responseRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Response, error) {
	var resp domain.Response
	q := `SELECT * FROM app.survey_responses WHERE id = $1 AND tenant_id = $2`
	if err := r.db.GetContext(ctx, &resp, q, id, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrResponseNotFound
		}
		return nil, fmt.Errorf("select response: %w", err)
	}
	return &resp, nil
}

func (r *responseRepo) CountByDistribution(ctx context.Context, distributionID uuid.UUID) (int, error) {
	var n int
	q := `SELECT COUNT(*) FROM app.survey_responses WHERE survey_id = $1`
	if err := r.db.GetContext(ctx, &n, q, distributionID); err != nil {
		return 0, fmt.Errorf("count responses: %w", err)
	}
	return n, nil
}

func (r *responseRepo) ListByDistribution(ctx context.Context, distributionID uuid.UUID) ([]*domain.Response, error) {
	var rows []*domain.Response
	q := `SELECT * FROM app.survey_responses WHERE survey_id = $1 ORDER BY completed_at ASC`
	if err := r.db.SelectContext(ctx, &rows, q, distributionID); err != nil {
		return nil, fmt.Errorf("list responses: %w", err)
	}
	return rows, nil
}

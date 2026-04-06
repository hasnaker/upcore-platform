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

// SurveyRepository abstracts persistence for surveys.
type SurveyRepository interface {
	Create(ctx context.Context, s *domain.Survey) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey, error)
	GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Survey, error)
	Update(ctx context.Context, s *domain.Survey) error
	List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Survey, int, error)
}

type surveyRepo struct {
	db *sqlx.DB
}

// NewSurveyRepository constructs a SurveyRepository backed by sqlx.
func NewSurveyRepository(db *sqlx.DB) SurveyRepository {
	return &surveyRepo{db: db}
}

func (r *surveyRepo) Create(ctx context.Context, s *domain.Survey) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now().UTC()
	s.CreatedAt = now
	s.UpdatedAt = now
	s.ApplyDefaults()

	q := `INSERT INTO app.surveys (
		id, tenant_id, instrument_id, title_tr, title_en, description_tr,
		survey_type, audience, is_anonymous, cadence, starts_at, ends_at,
		reminder_days, status, created_by, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :instrument_id, :title_tr, :title_en, :description_tr,
		:survey_type, :audience, :is_anonymous, :cadence, :starts_at, :ends_at,
		:reminder_days, :status, :created_by, :created_at, :updated_at
	)`
	_, err := r.db.NamedExecContext(ctx, q, s)
	if err != nil {
		return fmt.Errorf("insert survey: %w", err)
	}
	return nil
}

func (r *surveyRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey, error) {
	var s domain.Survey
	q := `SELECT * FROM app.surveys WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	if err := r.db.GetContext(ctx, &s, q, id, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrSurveyNotFound
		}
		return nil, fmt.Errorf("select survey: %w", err)
	}
	return &s, nil
}

func (r *surveyRepo) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Survey, error) {
	var s domain.Survey
	q := `SELECT * FROM app.surveys
		WHERE tenant_id = $1 AND survey_type = $2 AND deleted_at IS NULL
		ORDER BY created_at DESC LIMIT 1`
	if err := r.db.GetContext(ctx, &s, q, tenantID, code); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrSurveyNotFound
		}
		return nil, fmt.Errorf("select survey by code: %w", err)
	}
	return &s, nil
}

func (r *surveyRepo) Update(ctx context.Context, s *domain.Survey) error {
	s.UpdatedAt = time.Now().UTC()
	q := `UPDATE app.surveys SET
		title_tr = :title_tr, title_en = :title_en, description_tr = :description_tr,
		survey_type = :survey_type, audience = :audience, is_anonymous = :is_anonymous,
		cadence = :cadence, starts_at = :starts_at, ends_at = :ends_at,
		reminder_days = :reminder_days, status = :status, updated_at = :updated_at
	WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL`
	res, err := r.db.NamedExecContext(ctx, q, s)
	if err != nil {
		return fmt.Errorf("update survey: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrSurveyNotFound
	}
	return nil
}

func (r *surveyRepo) List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Survey, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var total int
	countQ := `SELECT COUNT(*) FROM app.surveys WHERE tenant_id = $1 AND deleted_at IS NULL`
	if err := r.db.GetContext(ctx, &total, countQ, tenantID); err != nil {
		return nil, 0, fmt.Errorf("count surveys: %w", err)
	}

	var rows []*domain.Survey
	listQ := `SELECT * FROM app.surveys
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	if err := r.db.SelectContext(ctx, &rows, listQ, tenantID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("list surveys: %w", err)
	}
	return rows, total, nil
}

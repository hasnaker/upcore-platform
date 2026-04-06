package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/ats/internal/db"
	"github.com/upcore/ats/internal/domain"
)

// InterviewRepository abstracts persistence for interviews.
type InterviewRepository interface {
	Create(ctx context.Context, i *domain.Interview) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Interview, error)
	Update(ctx context.Context, i *domain.Interview) error
	ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.Interview, error)
	ListForInterviewer(ctx context.Context, tenantID, interviewerID uuid.UUID, from, to time.Time) ([]*domain.Interview, error)
}

type interviewRepo struct {
	db *sqlx.DB
}

// NewInterviewRepository constructs an InterviewRepository backed by sqlx.
func NewInterviewRepository(d *sqlx.DB) InterviewRepository {
	return &interviewRepo{db: d}
}

// Create inserts an interview.
func (r *interviewRepo) Create(ctx context.Context, i *domain.Interview) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	now := time.Now().UTC()
	if i.CreatedAt.IsZero() {
		i.CreatedAt = now
	}
	i.UpdatedAt = now
	i.ApplyDefaults()

	_, err := r.db.NamedExecContext(ctx, db.QInsertInterview, i)
	if err != nil {
		return mapPqError(err)
	}
	return nil
}

// GetByID fetches an interview by ID, scoped to tenant.
func (r *interviewRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Interview, error) {
	var i domain.Interview
	if err := r.db.GetContext(ctx, &i, db.QSelectInterviewByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInterviewNotFound
		}
		return nil, fmt.Errorf("select interview: %w", err)
	}
	if i.TenantID != tenantID {
		return nil, domain.ErrInterviewNotFound
	}
	return &i, nil
}

// Update persists changes to an interview.
func (r *interviewRepo) Update(ctx context.Context, i *domain.Interview) error {
	i.UpdatedAt = time.Now().UTC()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateInterview, i)
	if err != nil {
		return mapPqError(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrInterviewNotFound
	}
	return nil
}

// ListByApplication returns interviews for an application.
func (r *interviewRepo) ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.Interview, error) {
	rows := []*domain.Interview{}
	if err := r.db.SelectContext(ctx, &rows, db.QSelectInterviewsByApplication, applicationID); err != nil {
		return nil, fmt.Errorf("list interviews: %w", err)
	}
	return rows, nil
}

// ListForInterviewer returns interviews assigned to a specific interviewer within a date range.
func (r *interviewRepo) ListForInterviewer(ctx context.Context, tenantID, interviewerID uuid.UUID, from, to time.Time) ([]*domain.Interview, error) {
	q := `
		SELECT ` + db.InterviewCols + `
		FROM app.interviews
		WHERE tenant_id = $1
		  AND $2::text = ANY(interviewer_ids)
		  AND scheduled_at >= $3
		  AND scheduled_at <= $4
		ORDER BY scheduled_at ASC`
	rows := []*domain.Interview{}
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, interviewerID.String(), from, to); err != nil {
		return nil, fmt.Errorf("list for interviewer: %w", err)
	}
	return rows, nil
}

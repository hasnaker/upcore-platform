package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/assessment/internal/db"
	"github.com/upcore/assessment/internal/domain"
)

// SessionRepository abstracts persistence for assessment sessions.
type SessionRepository interface {
	Create(ctx context.Context, s *domain.Session) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error)
	GetActiveByAssessment(ctx context.Context, assessmentID uuid.UUID) (*domain.Session, error)
	ListByAssessment(ctx context.Context, assessmentID uuid.UUID) ([]*domain.Session, error)
	Update(ctx context.Context, s *domain.Session) error
}

type sessionRepo struct {
	db *sqlx.DB
}

// NewSessionRepository constructs a SessionRepository backed by sqlx.
func NewSessionRepository(d *sqlx.DB) SessionRepository {
	return &sessionRepo{db: d}
}

// Create inserts a session.
func (r *sessionRepo) Create(ctx context.Context, s *domain.Session) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now
	if len(s.CheatingMetrics) == 0 {
		s.CheatingMetrics = domain.JSONB("{}")
	}

	_, err := r.db.NamedExecContext(ctx, db.QInsertSession, s)
	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

// GetByID fetches a session by ID.
func (r *sessionRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	var s domain.Session
	if err := r.db.GetContext(ctx, &s, db.QSelectSessionByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrSessionNotFound
		}
		return nil, fmt.Errorf("select session: %w", err)
	}
	return &s, nil
}

// GetActiveByAssessment returns the active session for an assessment.
func (r *sessionRepo) GetActiveByAssessment(ctx context.Context, assessmentID uuid.UUID) (*domain.Session, error) {
	q := `SELECT ` + db.SessionCols + `
		FROM app.assessment_sessions
		WHERE assessment_id = $1 AND status = 'active'
		ORDER BY created_at DESC
		LIMIT 1`
	var s domain.Session
	if err := r.db.GetContext(ctx, &s, q, assessmentID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrSessionNotFound
		}
		return nil, fmt.Errorf("select active session: %w", err)
	}
	return &s, nil
}

// ListByAssessment returns all sessions for an assessment.
func (r *sessionRepo) ListByAssessment(ctx context.Context, assessmentID uuid.UUID) ([]*domain.Session, error) {
	var sessions []*domain.Session
	if err := r.db.SelectContext(ctx, &sessions, db.QSelectSessionsByAssessment, assessmentID); err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	if sessions == nil {
		sessions = []*domain.Session{}
	}
	return sessions, nil
}

// Update persists changes to a session.
func (r *sessionRepo) Update(ctx context.Context, s *domain.Session) error {
	s.UpdatedAt = time.Now().UTC()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateSession, s)
	if err != nil {
		return fmt.Errorf("update session: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrSessionNotFound
	}
	return nil
}

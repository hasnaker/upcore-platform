package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/auth/internal/db"
	"github.com/upcore/auth/internal/domain"
)

// SessionRepo persists refresh-token sessions.
type SessionRepo struct {
	db *sqlx.DB
}

// NewSessionRepo constructs a SessionRepo.
func NewSessionRepo(database *sqlx.DB) *SessionRepo {
	return &SessionRepo{db: database}
}

// Create inserts a session.
func (r *SessionRepo) Create(ctx context.Context, s *domain.Session) error {
	if _, err := r.db.NamedExecContext(ctx, db.QSessionInsert, s); err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

// GetByTokenHash returns a session by its refresh_token_hash.
func (r *SessionRepo) GetByTokenHash(ctx context.Context, hash string) (*domain.Session, error) {
	var s domain.Session
	err := r.db.GetContext(ctx, &s, db.QSessionGetByTokenHash, hash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrSessionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("session by hash: %w", err)
	}
	return &s, nil
}

// GetByID returns a session by id.
func (r *SessionRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error) {
	var s domain.Session
	err := r.db.GetContext(ctx, &s, db.QSessionGetByID, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrSessionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("session by id: %w", err)
	}
	return &s, nil
}

// ListByUser returns all active sessions for a user.
func (r *SessionRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.Session, error) {
	var sessions []*domain.Session
	if err := r.db.SelectContext(ctx, &sessions, db.QSessionListByUser, userID); err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	return sessions, nil
}

// Revoke marks a single session as revoked.
func (r *SessionRepo) Revoke(ctx context.Context, id uuid.UUID, reason string) error {
	res, err := r.db.ExecContext(ctx, db.QSessionRevoke, id, reason)
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrSessionNotFound
	}
	return nil
}

// RevokeAllForUser revokes all of a user's sessions.
func (r *SessionRepo) RevokeAllForUser(ctx context.Context, userID uuid.UUID, reason string) (int64, error) {
	res, err := r.db.ExecContext(ctx, db.QSessionRevokeByUser, userID, reason)
	if err != nil {
		return 0, fmt.Errorf("revoke all sessions: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// DeleteExpired removes sessions that have been expired for more than 7 days.
func (r *SessionRepo) DeleteExpired(ctx context.Context) (int64, error) {
	res, err := r.db.ExecContext(ctx, db.QSessionDeleteExpired)
	if err != nil {
		return 0, fmt.Errorf("delete expired sessions: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

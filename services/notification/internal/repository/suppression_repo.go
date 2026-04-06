package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/notification/internal/domain"
)

// SuppressionRepository abstracts persistence for email suppression.
type SuppressionRepository interface {
	GetByEmail(ctx context.Context, email string) (*domain.Suppression, error)
	Upsert(ctx context.Context, email string, reason domain.SuppReason) error
	IncrementBounce(ctx context.Context, email string) (int, error)
	Delete(ctx context.Context, email string) error
	IsSuppressed(ctx context.Context, email string) (bool, error)
}

type suppressionRepo struct {
	db *sqlx.DB
}

// NewSuppressionRepository constructs a SuppressionRepository backed by sqlx.
func NewSuppressionRepository(db *sqlx.DB) SuppressionRepository {
	return &suppressionRepo{db: db}
}

// GetByEmail retrieves a suppression record.
func (r *suppressionRepo) GetByEmail(ctx context.Context, email string) (*domain.Suppression, error) {
	const q = `SELECT * FROM email_suppression WHERE email = $1`
	var s domain.Suppression
	if err := r.db.GetContext(ctx, &s, q, email); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get suppression: %w", err)
	}
	return &s, nil
}

// Upsert creates or updates a suppression entry.
func (r *suppressionRepo) Upsert(ctx context.Context, email string, reason domain.SuppReason) error {
	now := time.Now().UTC()
	const q = `
		INSERT INTO email_suppression (id, email, reason, bounce_count, created_at, updated_at)
		VALUES ($1, $2, $3, 1, $4, $4)
		ON CONFLICT (email)
		DO UPDATE SET reason = $3, updated_at = $4`
	_, err := r.db.ExecContext(ctx, q, uuid.New(), email, reason, now)
	if err != nil {
		return fmt.Errorf("upsert suppression: %w", err)
	}
	return nil
}

// IncrementBounce increments the bounce count and returns the new count.
func (r *suppressionRepo) IncrementBounce(ctx context.Context, email string) (int, error) {
	now := time.Now().UTC()
	const q = `
		INSERT INTO email_suppression (id, email, reason, bounce_count, created_at, updated_at)
		VALUES ($1, $2, 'bounce', 1, $3, $3)
		ON CONFLICT (email)
		DO UPDATE SET bounce_count = email_suppression.bounce_count + 1, updated_at = $3
		RETURNING bounce_count`
	var count int
	if err := r.db.GetContext(ctx, &count, q, uuid.New(), email, now); err != nil {
		return 0, fmt.Errorf("increment bounce: %w", err)
	}
	return count, nil
}

// Delete removes a suppression entry.
func (r *suppressionRepo) Delete(ctx context.Context, email string) error {
	const q = `DELETE FROM email_suppression WHERE email = $1`
	_, err := r.db.ExecContext(ctx, q, email)
	return err
}

// IsSuppressed checks whether an email is on the suppression list.
func (r *suppressionRepo) IsSuppressed(ctx context.Context, email string) (bool, error) {
	const q = `SELECT EXISTS(SELECT 1 FROM email_suppression WHERE email = $1)`
	var exists bool
	if err := r.db.GetContext(ctx, &exists, q, email); err != nil {
		return false, fmt.Errorf("check suppression: %w", err)
	}
	return exists, nil
}

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

// PreferenceRepository abstracts persistence for notification preferences.
type PreferenceRepository interface {
	Get(ctx context.Context, tenantID, userID uuid.UUID, channel domain.NotifChannel, category domain.Category) (*domain.Preference, error)
	Set(ctx context.Context, p *domain.Preference) error
	ListByUser(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.Preference, error)
	BulkSet(ctx context.Context, prefs []*domain.Preference) error
}

type preferenceRepo struct {
	db *sqlx.DB
}

// NewPreferenceRepository constructs a PreferenceRepository backed by sqlx.
func NewPreferenceRepository(db *sqlx.DB) PreferenceRepository {
	return &preferenceRepo{db: db}
}

// Get retrieves a single preference.
func (r *preferenceRepo) Get(ctx context.Context, tenantID, userID uuid.UUID, channel domain.NotifChannel, category domain.Category) (*domain.Preference, error) {
	const q = `
		SELECT * FROM notification_preferences
		WHERE tenant_id = $1 AND user_id = $2 AND channel = $3 AND category = $4`
	var p domain.Preference
	if err := r.db.GetContext(ctx, &p, q, tenantID, userID, channel, category); err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrPreferenceNotFound
		}
		return nil, fmt.Errorf("get preference: %w", err)
	}
	return &p, nil
}

// Set upserts a single preference.
func (r *preferenceRepo) Set(ctx context.Context, p *domain.Preference) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now().UTC()
	p.UpdatedAt = now
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}

	const q = `
		INSERT INTO notification_preferences (
			id, tenant_id, user_id, category, channel, opt_in, quiet_hours,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (tenant_id, user_id, channel, category)
		DO UPDATE SET opt_in = $6, quiet_hours = $7, updated_at = $9`
	_, err := r.db.ExecContext(ctx, q,
		p.ID, p.TenantID, p.UserID, p.Category, p.Channel, p.OptIn, p.QuietHours,
		p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("set preference: %w", err)
	}
	return nil
}

// ListByUser returns all preferences for a user.
func (r *preferenceRepo) ListByUser(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.Preference, error) {
	const q = `
		SELECT * FROM notification_preferences
		WHERE tenant_id = $1 AND user_id = $2
		ORDER BY category, channel`
	var items []*domain.Preference
	if err := r.db.SelectContext(ctx, &items, q, tenantID, userID); err != nil {
		return nil, fmt.Errorf("list preferences: %w", err)
	}
	return items, nil
}

// BulkSet upserts multiple preferences in a loop.
func (r *preferenceRepo) BulkSet(ctx context.Context, prefs []*domain.Preference) error {
	for _, p := range prefs {
		if err := r.Set(ctx, p); err != nil {
			return err
		}
	}
	return nil
}

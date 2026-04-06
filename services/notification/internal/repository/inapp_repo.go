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

// InAppRepository abstracts persistence for in-app notifications.
type InAppRepository interface {
	Create(ctx context.Context, n *domain.InAppNotification) error
	ListByUser(ctx context.Context, tenantID, userID uuid.UUID, unreadOnly bool, page, limit int) ([]*domain.InAppNotification, int, error)
	ListUnread(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.InAppNotification, error)
	MarkRead(ctx context.Context, tenantID, userID, id uuid.UUID) error
	MarkAllRead(ctx context.Context, tenantID, userID uuid.UUID) error
	CountUnread(ctx context.Context, tenantID, userID uuid.UUID) (int, error)
	Delete(ctx context.Context, tenantID, userID, id uuid.UUID) error
}

type inappRepo struct {
	db *sqlx.DB
}

// NewInAppRepository constructs an InAppRepository backed by sqlx.
func NewInAppRepository(db *sqlx.DB) InAppRepository {
	return &inappRepo{db: db}
}

// Create inserts a new in-app notification.
func (r *inappRepo) Create(ctx context.Context, n *domain.InAppNotification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now().UTC()
	}

	const q = `
		INSERT INTO notification_inapp (
			id, tenant_id, user_id, title, body, link_url, category,
			is_read, read_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err := r.db.ExecContext(ctx, q,
		n.ID, n.TenantID, n.UserID, n.Title, n.Body, n.LinkURL, n.Category,
		n.IsRead, n.ReadAt, n.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert inapp notification: %w", err)
	}
	return nil
}

// ListByUser returns in-app notifications for a user with optional unread filter.
func (r *inappRepo) ListByUser(ctx context.Context, tenantID, userID uuid.UUID, unreadOnly bool, page, limit int) ([]*domain.InAppNotification, int, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	where := "WHERE tenant_id = $1 AND user_id = $2"
	args := []any{tenantID, userID}
	if unreadOnly {
		where += " AND is_read = false"
	}

	var total int
	if err := r.db.GetContext(ctx, &total,
		fmt.Sprintf("SELECT COUNT(*) FROM notification_inapp %s", where), args...); err != nil {
		return nil, 0, err
	}

	var items []*domain.InAppNotification
	if err := r.db.SelectContext(ctx, &items,
		fmt.Sprintf("SELECT * FROM notification_inapp %s ORDER BY created_at DESC LIMIT %d OFFSET %d",
			where, limit, offset), args...); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// ListUnread returns all unread in-app notifications.
func (r *inappRepo) ListUnread(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.InAppNotification, error) {
	const q = `
		SELECT * FROM notification_inapp
		WHERE tenant_id = $1 AND user_id = $2 AND is_read = false
		ORDER BY created_at DESC
		LIMIT 100`
	var items []*domain.InAppNotification
	if err := r.db.SelectContext(ctx, &items, q, tenantID, userID); err != nil {
		return nil, fmt.Errorf("list unread: %w", err)
	}
	return items, nil
}

// MarkRead marks a single notification as read.
func (r *inappRepo) MarkRead(ctx context.Context, tenantID, userID, id uuid.UUID) error {
	now := time.Now().UTC()
	const q = `UPDATE notification_inapp SET is_read = true, read_at = $1 WHERE id = $2 AND tenant_id = $3 AND user_id = $4`
	result, err := r.db.ExecContext(ctx, q, now, id, tenantID, userID)
	if err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// MarkAllRead marks all unread notifications for a user as read.
func (r *inappRepo) MarkAllRead(ctx context.Context, tenantID, userID uuid.UUID) error {
	now := time.Now().UTC()
	const q = `UPDATE notification_inapp SET is_read = true, read_at = $1 WHERE tenant_id = $2 AND user_id = $3 AND is_read = false`
	_, err := r.db.ExecContext(ctx, q, now, tenantID, userID)
	return err
}

// CountUnread returns the number of unread notifications.
func (r *inappRepo) CountUnread(ctx context.Context, tenantID, userID uuid.UUID) (int, error) {
	const q = `SELECT COUNT(*) FROM notification_inapp WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`
	var n int
	if err := r.db.GetContext(ctx, &n, q, tenantID, userID); err != nil {
		return 0, err
	}
	return n, nil
}

// Delete removes a single in-app notification.
func (r *inappRepo) Delete(ctx context.Context, tenantID, userID, id uuid.UUID) error {
	const q = `DELETE FROM notification_inapp WHERE id = $1 AND tenant_id = $2 AND user_id = $3`
	result, err := r.db.ExecContext(ctx, q, id, tenantID, userID)
	if err != nil {
		return fmt.Errorf("delete inapp: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

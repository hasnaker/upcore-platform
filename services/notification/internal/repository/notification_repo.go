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

// NotificationRepository abstracts persistence for notifications.
type NotificationRepository interface {
	Create(ctx context.Context, n *domain.Notification) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Notification, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.NotifStatus, providerRef *string, failReason *string) error
	MarkSent(ctx context.Context, id uuid.UUID, providerRef string) error
	MarkDelivered(ctx context.Context, id uuid.UUID) error
	MarkFailed(ctx context.Context, id uuid.UUID, reason string) error
	MarkBounced(ctx context.Context, id uuid.UUID, reason string) error
	ListForRetry(ctx context.Context, maxRetries, limit int) ([]*domain.Notification, error)
	ListByRecipient(ctx context.Context, tenantID, userID uuid.UUID, channel string, page, limit int) ([]*domain.Notification, int, error)
	CountByStatus(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error)
}

type notificationRepo struct {
	db *sqlx.DB
}

// NewNotificationRepository constructs a NotificationRepository backed by sqlx.
func NewNotificationRepository(db *sqlx.DB) NotificationRepository {
	return &notificationRepo{db: db}
}

// Create inserts a notification.
func (r *notificationRepo) Create(ctx context.Context, n *domain.Notification) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	now := time.Now().UTC()
	n.CreatedAt = now
	n.UpdatedAt = now

	const q = `
		INSERT INTO notifications (
			id, tenant_id, user_id, employee_id, channel, template_key,
			subject, body, payload, priority, status, scheduled_at,
			sent_at, delivered_at, read_at, failed_at, error_message,
			retry_count, provider_ref, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17,
			$18, $19, $20, $21
		)`
	_, err := r.db.ExecContext(ctx, q,
		n.ID, n.TenantID, n.UserID, n.EmployeeID, n.Channel, n.TemplateKey,
		n.Subject, n.Body, n.Payload, n.Priority, n.Status, n.ScheduledAt,
		n.SentAt, n.DeliveredAt, n.ReadAt, n.FailedAt, n.ErrorMessage,
		n.RetryCount, n.ProviderRef, n.CreatedAt, n.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert notification: %w", err)
	}
	return nil
}

// GetByID retrieves a notification by ID.
func (r *notificationRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Notification, error) {
	const q = `SELECT * FROM notifications WHERE id = $1`
	var n domain.Notification
	if err := r.db.GetContext(ctx, &n, q, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotificationNotFound
		}
		return nil, fmt.Errorf("get notification: %w", err)
	}
	return &n, nil
}

// UpdateStatus updates the status and related fields.
func (r *notificationRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.NotifStatus, providerRef, failReason *string) error {
	now := time.Now().UTC()
	const q = `
		UPDATE notifications SET
			status = $1, provider_ref = COALESCE($2, provider_ref),
			error_message = COALESCE($3, error_message),
			updated_at = $4
		WHERE id = $5`
	_, err := r.db.ExecContext(ctx, q, status, providerRef, failReason, now, id)
	return err
}

// MarkSent marks notification as sent with provider reference.
func (r *notificationRepo) MarkSent(ctx context.Context, id uuid.UUID, providerRef string) error {
	now := time.Now().UTC()
	const q = `UPDATE notifications SET status = 'sent', sent_at = $1, provider_ref = $2, updated_at = $1 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, q, now, providerRef, id)
	return err
}

// MarkDelivered marks notification as delivered.
func (r *notificationRepo) MarkDelivered(ctx context.Context, id uuid.UUID) error {
	now := time.Now().UTC()
	const q = `UPDATE notifications SET status = 'delivered', delivered_at = $1, updated_at = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, q, now, id)
	return err
}

// MarkFailed marks notification as failed with a retry increment.
func (r *notificationRepo) MarkFailed(ctx context.Context, id uuid.UUID, reason string) error {
	now := time.Now().UTC()
	const q = `
		UPDATE notifications SET
			status = 'failed', failed_at = $1, error_message = $2,
			retry_count = retry_count + 1, updated_at = $1
		WHERE id = $3`
	_, err := r.db.ExecContext(ctx, q, now, reason, id)
	return err
}

// MarkBounced marks notification as bounced.
func (r *notificationRepo) MarkBounced(ctx context.Context, id uuid.UUID, reason string) error {
	now := time.Now().UTC()
	const q = `UPDATE notifications SET status = 'bounced', error_message = $1, updated_at = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, q, reason, now, id)
	return err
}

// ListForRetry returns failed notifications eligible for retry.
func (r *notificationRepo) ListForRetry(ctx context.Context, maxRetries, limit int) ([]*domain.Notification, error) {
	if limit <= 0 {
		limit = 50
	}
	const q = `
		SELECT * FROM notifications
		WHERE status = 'failed' AND retry_count < $1
		ORDER BY failed_at ASC
		LIMIT $2`
	var items []*domain.Notification
	if err := r.db.SelectContext(ctx, &items, q, maxRetries, limit); err != nil {
		return nil, fmt.Errorf("list for retry: %w", err)
	}
	return items, nil
}

// ListByRecipient returns notifications for a specific user.
func (r *notificationRepo) ListByRecipient(ctx context.Context, tenantID, userID uuid.UUID, channel string, page, limit int) ([]*domain.Notification, int, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	baseWhere := "WHERE tenant_id = $1 AND user_id = $2"
	args := []any{tenantID, userID}
	if channel != "" {
		baseWhere += " AND channel = $3"
		args = append(args, channel)
	}

	var total int
	if err := r.db.GetContext(ctx, &total,
		fmt.Sprintf("SELECT COUNT(*) FROM notifications %s", baseWhere), args...); err != nil {
		return nil, 0, err
	}

	var items []*domain.Notification
	if err := r.db.SelectContext(ctx, &items,
		fmt.Sprintf("SELECT * FROM notifications %s ORDER BY created_at DESC LIMIT %d OFFSET %d",
			baseWhere, limit, offset), args...); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// CountByStatus returns notification counts grouped by status.
func (r *notificationRepo) CountByStatus(ctx context.Context, tenantID uuid.UUID, from, to time.Time) (map[string]int, error) {
	const q = `
		SELECT status AS key, COUNT(*) AS count FROM notifications
		WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
		GROUP BY status`
	type row struct {
		Key   string `db:"key"`
		Count int    `db:"count"`
	}
	var rows []row
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, from, to); err != nil {
		return nil, err
	}
	m := make(map[string]int, len(rows))
	for _, r := range rows {
		m[r.Key] = r.Count
	}
	return m, nil
}

package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// OutboxRow mirrors app.event_outbox (read-side DTO for admin endpoints).
type OutboxRow struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	TenantID     uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ServiceName  string     `db:"service_name" json:"service_name"`
	EventType    string     `db:"event_type" json:"event_type"`
	AggregateID  *uuid.UUID `db:"aggregate_id" json:"aggregate_id,omitempty"`
	Payload      []byte     `db:"payload" json:"-"`
	Dispatched   bool       `db:"dispatched" json:"dispatched"`
	DispatchedAt *time.Time `db:"dispatched_at" json:"dispatched_at,omitempty"`
	Attempts     int        `db:"attempts" json:"attempts"`
	LastError    *string    `db:"last_error" json:"last_error,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`
}

// OutboxStats aggregates counts for the admin dashboard.
type OutboxStats struct {
	Pending    int `json:"pending"`
	Dispatched int `json:"dispatched"`
	DeadLetter int `json:"dead_letter"` // attempts >= max_retries AND !dispatched
	Total      int `json:"total"`
}

// OutboxAdminRepository supports admin/ops queries against app.event_outbox.
type OutboxAdminRepository interface {
	Stats(ctx context.Context, tenantID uuid.UUID, maxRetries int) (*OutboxStats, error)
	ListDeadLetter(ctx context.Context, tenantID uuid.UUID, maxRetries, limit, offset int) ([]*OutboxRow, int, error)
	Replay(ctx context.Context, tenantID, id uuid.UUID) error
}

type outboxAdminRepo struct{ db *sqlx.DB }

// NewOutboxAdminRepository constructs the repo.
func NewOutboxAdminRepository(d *sqlx.DB) OutboxAdminRepository { return &outboxAdminRepo{db: d} }

const outboxCols = `id, tenant_id, service_name, event_type, aggregate_id, payload,
	dispatched, dispatched_at, attempts, last_error, created_at, updated_at`

// Stats returns pending/dispatched/dead_letter/total counts for the tenant.
func (r *outboxAdminRepo) Stats(ctx context.Context, tenantID uuid.UUID, maxRetries int) (*OutboxStats, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var s OutboxStats
	q := `SELECT
	    COUNT(*) FILTER (WHERE dispatched = FALSE AND attempts < $2)             AS pending,
	    COUNT(*) FILTER (WHERE dispatched = TRUE)                                AS dispatched,
	    COUNT(*) FILTER (WHERE dispatched = FALSE AND attempts >= $2)            AS dead_letter,
	    COUNT(*)                                                                 AS total
	FROM app.event_outbox WHERE tenant_id = $1`
	if err := tx.QueryRowxContext(ctx, q, tenantID, maxRetries).
		Scan(&s.Pending, &s.Dispatched, &s.DeadLetter, &s.Total); err != nil {
		return nil, fmt.Errorf("outbox stats: %w", err)
	}
	return &s, nil
}

// ListDeadLetter returns events that exceeded the retry threshold.
func (r *outboxAdminRepo) ListDeadLetter(ctx context.Context, tenantID uuid.UUID, maxRetries, limit, offset int) ([]*OutboxRow, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = tx.Rollback() }()

	var total int
	if err := tx.GetContext(ctx, &total,
		`SELECT COUNT(*) FROM app.event_outbox
		 WHERE tenant_id = $1 AND dispatched = FALSE AND attempts >= $2`,
		tenantID, maxRetries,
	); err != nil {
		return nil, 0, fmt.Errorf("count dlq: %w", err)
	}

	rows := []*OutboxRow{}
	q := `SELECT ` + outboxCols + ` FROM app.event_outbox
	      WHERE tenant_id = $1 AND dispatched = FALSE AND attempts >= $2
	      ORDER BY updated_at DESC
	      LIMIT $3 OFFSET $4`
	if err := tx.SelectContext(ctx, &rows, q, tenantID, maxRetries, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("list dlq: %w", err)
	}
	return rows, total, nil
}

// Replay resets attempts/last_error so the dispatcher picks the row up again.
func (r *outboxAdminRepo) Replay(ctx context.Context, tenantID, id uuid.UUID) error {
	tx, err := txWithTenant(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.ExecContext(ctx,
		`UPDATE app.event_outbox
		 SET attempts = 0, last_error = NULL, updated_at = NOW()
		 WHERE tenant_id = $1 AND id = $2 AND dispatched = FALSE`,
		tenantID, id,
	)
	if err != nil {
		return fmt.Errorf("replay: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("outbox row not found or already dispatched")
	}
	return tx.Commit()
}

// ensure beginTx is available (defined in repo.go). If this repo is built
// standalone (without the rest of repository package), uncomment below:
var _ = sql.ErrNoRows

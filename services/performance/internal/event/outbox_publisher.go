package event

import (
	"context"
	"fmt"
	"sync/atomic"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// OutboxPublisher is an event.Publisher that persists events to app.event_outbox
// via a short transaction. The OutboxDispatcher goroutine then drains pending
// rows to the real broker asynchronously.
type OutboxPublisher struct {
	Inner       Publisher
	DB          *sqlx.DB
	Writer      *OutboxWriter
	TenantFn    func(ctx context.Context) uuid.UUID
	Log         zerolog.Logger
	fallbackCnt atomic.Uint64
}

// NewOutboxPublisher constructs an outbox-backed publisher.
func NewOutboxPublisher(
	inner Publisher,
	db *sqlx.DB,
	writer *OutboxWriter,
	tenantFn func(ctx context.Context) uuid.UUID,
	log zerolog.Logger,
) *OutboxPublisher {
	return &OutboxPublisher{Inner: inner, DB: db, Writer: writer, TenantFn: tenantFn, Log: log}
}

// Publish writes the event into app.event_outbox.
func (p *OutboxPublisher) Publish(ctx context.Context, topic string, payload any) error {
	tenantID := uuid.Nil
	if p.TenantFn != nil {
		tenantID = p.TenantFn(ctx)
	}
	if tenantID == uuid.Nil {
		p.fallbackCnt.Add(1)
		p.Log.Debug().Str("topic", topic).
			Msg("outbox publisher: no tenant, falling back to direct publish")
		return p.Inner.Publish(ctx, topic, payload)
	}

	tx, err := p.DB.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("outbox tx begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx,
		"SELECT set_config('app.tenant_id', $1, true)", tenantID.String()); err != nil {
		return fmt.Errorf("outbox rls: %w", err)
	}
	if err := p.Writer.Append(ctx, tx, tenantID, topic, nil, payload); err != nil {
		return fmt.Errorf("outbox append: %w", err)
	}
	return tx.Commit()
}

// Close propagates to the wrapped publisher.
func (p *OutboxPublisher) Close() error {
	if p.Inner == nil {
		return nil
	}
	return p.Inner.Close()
}

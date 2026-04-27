package event

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// OutboxRow mirrors app.event_outbox.
type OutboxRow struct {
	ID           uuid.UUID  `db:"id"`
	TenantID     uuid.UUID  `db:"tenant_id"`
	ServiceName  string     `db:"service_name"`
	EventType    string     `db:"event_type"`
	AggregateID  *uuid.UUID `db:"aggregate_id"`
	Payload      []byte     `db:"payload"`
	Dispatched   bool       `db:"dispatched"`
	DispatchedAt *time.Time `db:"dispatched_at"`
	Attempts     int        `db:"attempts"`
	LastError    *string    `db:"last_error"`
	CreatedAt    time.Time  `db:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"`
}

// OutboxWriter appends events to the outbox inside a caller-supplied tx.
type OutboxWriter struct{ serviceName string }

// NewOutboxWriter constructs a writer.
func NewOutboxWriter(serviceName string) *OutboxWriter { return &OutboxWriter{serviceName: serviceName} }

// Append writes an outbox row.
func (w *OutboxWriter) Append(
	ctx context.Context, tx *sqlx.Tx,
	tenantID uuid.UUID, eventType string, aggregateID *uuid.UUID, payload any,
) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal outbox payload: %w", err)
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO app.event_outbox (
			id, tenant_id, service_name, event_type, aggregate_id, payload
		) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
		tenantID, w.serviceName, eventType, aggregateID, body,
	)
	if err != nil {
		return fmt.Errorf("insert outbox: %w", err)
	}
	return nil
}

// OutboxDispatcher polls the outbox and ships pending rows to the publisher.
type OutboxDispatcher struct {
	DB         *sqlx.DB
	Publisher  Publisher
	Interval   time.Duration
	BatchSize  int
	MaxRetries int
	Log        zerolog.Logger
}

// NewOutboxDispatcher wires sensible defaults (2s poll, batch=50, max_retries=10).
func NewOutboxDispatcher(db *sqlx.DB, publisher Publisher, log zerolog.Logger) *OutboxDispatcher {
	return &OutboxDispatcher{
		DB: db, Publisher: publisher,
		Interval: 2 * time.Second, BatchSize: 50, MaxRetries: 10,
		Log: log,
	}
}

// Run blocks until ctx is cancelled.
func (d *OutboxDispatcher) Run(ctx context.Context) {
	interval := d.Interval
	if interval <= 0 {
		interval = 2 * time.Second
	}
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			d.Log.Info().Msg("outbox dispatcher stopped")
			return
		case <-t.C:
			if err := d.tick(ctx); err != nil {
				d.Log.Error().Err(err).Msg("outbox dispatcher tick failed")
			}
		}
	}
}

func (d *OutboxDispatcher) tick(ctx context.Context) error {
	batch := d.BatchSize
	if batch <= 0 {
		batch = 50
	}
	rows := []OutboxRow{}
	q := `SELECT id, tenant_id, service_name, event_type, aggregate_id, payload,
	              dispatched, dispatched_at, attempts, last_error, created_at, updated_at
	       FROM app.event_outbox
	       WHERE dispatched = FALSE AND attempts < $1
	       ORDER BY created_at
	       LIMIT $2`
	if err := d.DB.SelectContext(ctx, &rows, q, d.MaxRetries, batch); err != nil {
		return fmt.Errorf("select pending: %w", err)
	}
	for _, r := range rows {
		if ctx.Err() != nil {
			return nil
		}
		d.dispatchOne(ctx, r)
	}
	return nil
}

func (d *OutboxDispatcher) dispatchOne(ctx context.Context, r OutboxRow) {
	var payload any
	if len(r.Payload) > 0 {
		_ = json.Unmarshal(r.Payload, &payload)
	}
	err := d.Publisher.Publish(ctx, r.EventType, payload)
	if err != nil {
		msg := err.Error()
		if len(msg) > 500 {
			msg = msg[:500]
		}
		if _, uerr := d.DB.ExecContext(ctx,
			`UPDATE app.event_outbox
			 SET attempts = attempts + 1, last_error = $2, updated_at = NOW()
			 WHERE id = $1`, r.ID, msg); uerr != nil {
			d.Log.Error().Err(uerr).Str("outbox_id", r.ID.String()).Msg("record attempt failed")
		}
		d.Log.Warn().Err(err).Str("event_type", r.EventType).
			Int("attempts", r.Attempts+1).Msg("outbox dispatch failed")
		return
	}
	if _, err := d.DB.ExecContext(ctx,
		`UPDATE app.event_outbox
		 SET dispatched = TRUE, dispatched_at = NOW(), updated_at = NOW()
		 WHERE id = $1`, r.ID); err != nil {
		d.Log.Error().Err(err).Str("outbox_id", r.ID.String()).Msg("mark dispatched failed")
	}
}

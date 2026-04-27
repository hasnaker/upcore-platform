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

// OutboxRow represents one app.event_outbox record.
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

// OutboxWriter writes events to the outbox inside a caller-supplied
// sql transaction. The business change + outbox row commit atomically.
type OutboxWriter struct {
	serviceName string
}

// NewOutboxWriter constructs a writer.
func NewOutboxWriter(serviceName string) *OutboxWriter { return &OutboxWriter{serviceName: serviceName} }

// Append inserts an outbox row within an ongoing tx. The service layer
// builds its domain change + calls Append inside the same BeginTxx.
func (w *OutboxWriter) Append(
	ctx context.Context,
	tx *sqlx.Tx,
	tenantID uuid.UUID,
	eventType string,
	aggregateID *uuid.UUID,
	payload any,
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

// OutboxDispatcher polls the outbox for pending rows and ships them to the
// wrapped Publisher. Designed to run as a background goroutine inside main.
type OutboxDispatcher struct {
	DB         *sqlx.DB
	Publisher  Publisher
	Interval   time.Duration // between polls (default 2s)
	BatchSize  int           // max rows per poll (default 50)
	MaxRetries int           // drop (log as poison) after this many attempts (default 10)
	Log        zerolog.Logger
}

// NewOutboxDispatcher wires sensible defaults.
func NewOutboxDispatcher(db *sqlx.DB, publisher Publisher, log zerolog.Logger) *OutboxDispatcher {
	return &OutboxDispatcher{
		DB:         db,
		Publisher:  publisher,
		Interval:   2 * time.Second,
		BatchSize:  50,
		MaxRetries: 10,
		Log:        log,
	}
}

// Run loops until ctx is cancelled. Each tick:
//  1. SELECT pending rows (dispatched=FALSE, attempts<MaxRetries).
//  2. For each, Publish + mark dispatched on success.
//  3. On failure, increment attempts + record last_error.
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

// tick processes one batch. Non-blocking on empty queue.
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
	if len(rows) == 0 {
		return nil
	}
	for _, r := range rows {
		if ctx.Err() != nil {
			return nil
		}
		d.dispatchOne(ctx, r)
	}
	return nil
}

// dispatchOne publishes a single row and updates its state.
func (d *OutboxDispatcher) dispatchOne(ctx context.Context, r OutboxRow) {
	// Wire the raw JSON payload straight through — Publisher wraps envelope itself.
	var payload any
	if len(r.Payload) > 0 {
		_ = json.Unmarshal(r.Payload, &payload)
	}
	err := d.Publisher.Publish(ctx, r.EventType, payload)
	if err != nil {
		errMsg := err.Error()
		if len(errMsg) > 500 {
			errMsg = errMsg[:500]
		}
		if _, uerr := d.DB.ExecContext(ctx,
			`UPDATE app.event_outbox
			 SET attempts = attempts + 1, last_error = $2, updated_at = NOW()
			 WHERE id = $1`,
			r.ID, errMsg,
		); uerr != nil {
			d.Log.Error().Err(uerr).Str("outbox_id", r.ID.String()).Msg("failed to record attempt")
		}
		d.Log.Warn().
			Err(err).
			Str("event_type", r.EventType).
			Str("outbox_id", r.ID.String()).
			Int("attempts", r.Attempts+1).
			Msg("outbox dispatch failed")
		return
	}
	if _, err := d.DB.ExecContext(ctx,
		`UPDATE app.event_outbox
		 SET dispatched = TRUE, dispatched_at = NOW(), updated_at = NOW()
		 WHERE id = $1`,
		r.ID,
	); err != nil {
		d.Log.Error().Err(err).Str("outbox_id", r.ID.String()).Msg("failed to mark dispatched")
	}
}

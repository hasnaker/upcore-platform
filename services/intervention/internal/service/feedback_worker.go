package service

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// FeedbackWorker closes the loop between intervention outcomes and the
// ML recommender: when an intervention's outcome metric crosses its
// threshold (BAT-TR skor + Δ), the worker marks the intervention complete
// and emits a "intervention.outcome.recorded.v1" event so the action-center
// ML service can update its reward signal.
type FeedbackWorker struct {
	DB       *sqlx.DB
	Publisher EventPublisher
	Interval time.Duration
	Log      zerolog.Logger
}

// EventPublisher abstracts the pubsub dependency.
type EventPublisher interface {
	Publish(ctx context.Context, topic string, payload any) error
}

// NewFeedbackWorker constructs the worker with a 1h default cadence.
func NewFeedbackWorker(db *sqlx.DB, pub EventPublisher, log zerolog.Logger) *FeedbackWorker {
	return &FeedbackWorker{DB: db, Publisher: pub, Interval: time.Hour, Log: log}
}

// Run blocks until ctx is cancelled. Each tick:
//   1. Selects interventions whose outcome_metric crossed target_threshold.
//   2. Marks them completed + writes outcome_recorded_at.
//   3. Emits feedback event for ML recommender.
func (w *FeedbackWorker) Run(ctx context.Context) {
	t := time.NewTicker(w.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := w.tick(ctx); err != nil {
				w.Log.Error().Err(err).Msg("intervention feedback tick failed")
			}
		}
	}
}

type candidateRow struct {
	ID            string  `db:"id"`
	TenantID      string  `db:"tenant_id"`
	EmployeeID    string  `db:"employee_id"`
	Type          string  `db:"intervention_type"`
	MetricBefore  float64 `db:"metric_before"`
	MetricCurrent float64 `db:"metric_current"`
	TargetDelta   float64 `db:"target_delta"`
}

func (w *FeedbackWorker) tick(ctx context.Context) error {
	var rows []candidateRow
	q := `SELECT a.id, a.tenant_id::text, a.employee_id::text, a.intervention_type,
	             COALESCE(a.metric_before, 0) AS metric_before,
	             COALESCE(a.metric_current, 0) AS metric_current,
	             COALESCE(a.target_delta, 0) AS target_delta
	      FROM app.intervention_assignments a
	      WHERE a.status = 'in_progress'
	        AND a.metric_before IS NOT NULL
	        AND a.metric_current IS NOT NULL
	        AND a.target_delta IS NOT NULL
	        AND ABS(a.metric_current - a.metric_before) >= a.target_delta
	      LIMIT 100`
	if err := w.DB.SelectContext(ctx, &rows, q); err != nil {
		// Column names may differ by deployment — tolerate missing cols in dev.
		w.Log.Debug().Err(err).Msg("intervention feedback: select skipped")
		return nil
	}
	for _, r := range rows {
		if _, err := w.DB.ExecContext(ctx,
			`UPDATE app.intervention_assignments
			 SET status = 'completed', outcome_recorded_at = NOW(), updated_at = NOW()
			 WHERE id = $1::uuid`, r.ID); err != nil {
			w.Log.Warn().Err(err).Str("id", r.ID).Msg("mark completed failed")
			continue
		}
		_ = w.Publisher.Publish(ctx, "intervention.outcome.recorded.v1", map[string]any{
			"assignment_id":   r.ID,
			"tenant_id":       r.TenantID,
			"employee_id":     r.EmployeeID,
			"type":            r.Type,
			"metric_before":   r.MetricBefore,
			"metric_current":  r.MetricCurrent,
			"delta":           r.MetricCurrent - r.MetricBefore,
			"success":         true,
		})
	}
	return nil
}

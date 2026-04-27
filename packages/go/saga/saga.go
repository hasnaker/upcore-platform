// Package saga implements the Saga pattern for cross-service transactions.
// Each saga is a sequence of steps; failure triggers compensation in reverse
// order. The orchestrator persists state in app.saga_instances + app.saga_steps
// so that crashes/restarts can resume incomplete sagas.
package saga

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

var _ = time.Second // keep time import alive

// StepResult is the outcome of a single step.
type StepResult struct {
	Response any    // JSON-serializable output, stored for audit + passed to next step
	Err      error // non-nil → trigger compensation
}

// Step is one unit of work in a saga. Execute performs the forward action;
// Compensate undoes it (best-effort, idempotent).
type Step interface {
	Name() string
	Execute(ctx context.Context, state State) StepResult
	Compensate(ctx context.Context, state State) error
}

// State is the shared data bag passed between steps. Mutations persist to DB.
type State struct {
	TenantID      uuid.UUID
	AggregateID   *uuid.UUID
	CorrelationID string
	Data          map[string]any
}

// Get returns a typed value or the zero value.
func (s State) Get(key string) any { return s.Data[key] }

// Definition bundles a named saga with its ordered steps.
type Definition struct {
	Name  string
	Steps []Step
}

// Orchestrator persists and runs sagas.
type Orchestrator struct {
	DB      *sqlx.DB
	Metrics *Metrics
}

// NewOrchestrator constructs an orchestrator with the default (no-op) metrics.
// Use WithMetrics to attach Prometheus collectors.
func NewOrchestrator(db *sqlx.DB) *Orchestrator {
	return &Orchestrator{DB: db, Metrics: DefaultMetrics()}
}

// WithMetrics returns a copy of the orchestrator with the provided metrics.
// Zero-allocation and safe to chain after NewOrchestrator.
func (o *Orchestrator) WithMetrics(m *Metrics) *Orchestrator {
	if m == nil {
		return o
	}
	return &Orchestrator{DB: o.DB, Metrics: m}
}

// Start creates a new saga instance and runs it to completion (or failure →
// compensation). Returns the final instance row.
//
// Idempotency: if (tenant, saga_name, correlation_id) already exists, the
// existing instance is returned — safe to call from event handlers.
func (o *Orchestrator) Start(
	ctx context.Context,
	def Definition,
	state State,
) (*Instance, error) {
	if def.Name == "" || len(def.Steps) == 0 {
		return nil, errors.New("saga: empty definition")
	}
	if state.TenantID == uuid.Nil {
		return nil, errors.New("saga: tenant_id required")
	}
	if state.Data == nil {
		state.Data = map[string]any{}
	}

	// Idempotent insert by (tenant, name, correlation_id) — when correlation
	// is provided. Without one, always insert a new row.
	instance, err := o.findExisting(ctx, state.TenantID, def.Name, state.CorrelationID)
	if err != nil {
		return nil, err
	}
	if instance != nil {
		// Already running or completed — return as-is (idempotency).
		return instance, nil
	}

	instance, err = o.insert(ctx, def, state)
	if err != nil {
		return nil, err
	}

	return o.run(ctx, def, instance, state)
}

// Resume re-enters an existing (reset) instance from its current_step. Used
// by admin retry: MarkForRetry sets status back to 'running', then Resume
// runs the remaining steps. Safe to call multiple times — idempotent via the
// DB current_step pointer.
func (o *Orchestrator) Resume(
	ctx context.Context,
	def Definition,
	inst *Instance,
	state State,
) (*Instance, error) {
	if state.Data == nil {
		state.Data = map[string]any{}
	}
	return o.run(ctx, def, inst, state)
}

// run iterates through steps; on failure triggers compensation chain.
func (o *Orchestrator) run(
	ctx context.Context,
	def Definition,
	inst *Instance,
	state State,
) (*Instance, error) {
	o.Metrics.incInFlight(def.Name)
	start := time.Now()
	defer func() {
		o.Metrics.decInFlight(def.Name)
		o.Metrics.recordDuration(def.Name, inst.Status, time.Since(start))
	}()

	for i := inst.CurrentStep; i < len(def.Steps); i++ {
		step := def.Steps[i]
		stepID, err := o.beginStep(ctx, inst.ID, i, step.Name(), "execute", state)
		if err != nil {
			return inst, err
		}
		res := step.Execute(ctx, state)
		if res.Err != nil {
			_ = o.failStep(ctx, stepID, res.Err)
			o.Metrics.recordStep(def.Name, step.Name(), "execute", "failed")
			_ = o.setInstanceStatus(ctx, inst.ID, "compensating", res.Err.Error())
			compErr := o.compensate(ctx, def, inst, state, i-1)
			if compErr != nil {
				_ = o.setInstanceStatus(ctx, inst.ID, "failed", fmt.Sprintf("compensate failed: %v (orig: %v)", compErr, res.Err))
				inst.Status = "failed"
				o.Metrics.recordInstance(def.Name, "failed")
				return inst, compErr
			}
			_ = o.setInstanceStatus(ctx, inst.ID, "compensated", res.Err.Error())
			inst.Status = "compensated"
			o.Metrics.recordInstance(def.Name, "compensated")
			return inst, res.Err
		}
		_ = o.succeedStep(ctx, stepID, res.Response)
		o.Metrics.recordStep(def.Name, step.Name(), "execute", "success")
		_ = o.advanceStep(ctx, inst.ID, i+1)
	}
	_ = o.setInstanceStatus(ctx, inst.ID, "completed", "")
	inst.Status = "completed"
	o.Metrics.recordInstance(def.Name, "completed")
	return inst, nil
}

// compensate calls Compensate() on all already-executed steps in reverse.
func (o *Orchestrator) compensate(
	ctx context.Context,
	def Definition,
	inst *Instance,
	state State,
	lastExecutedIndex int,
) error {
	for i := lastExecutedIndex; i >= 0; i-- {
		step := def.Steps[i]
		stepID, err := o.beginStep(ctx, inst.ID, i, step.Name(), "compensate", state)
		if err != nil {
			return err
		}
		if err := step.Compensate(ctx, state); err != nil {
			_ = o.failStep(ctx, stepID, err)
			o.Metrics.recordStep(def.Name, step.Name(), "compensate", "failed")
			return err
		}
		_ = o.succeedStep(ctx, stepID, nil)
		o.Metrics.recordStep(def.Name, step.Name(), "compensate", "success")
	}
	return nil
}

// ----------------------------------------------------------------------------
// Persistence helpers
// ----------------------------------------------------------------------------

// Instance mirrors app.saga_instances.
type Instance struct {
	ID            uuid.UUID  `db:"id"`
	TenantID      uuid.UUID  `db:"tenant_id"`
	SagaName      string     `db:"saga_name"`
	CorrelationID *string    `db:"correlation_id"`
	AggregateID   *uuid.UUID `db:"aggregate_id"`
	CurrentStep   int        `db:"current_step"`
	TotalSteps    int        `db:"total_steps"`
	Status        string     `db:"status"`
	Payload       []byte     `db:"payload"`
	LastError     *string    `db:"last_error"`
	CreatedAt     time.Time  `db:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at"`
	CompletedAt   *time.Time `db:"completed_at"`
}

func (o *Orchestrator) findExisting(ctx context.Context, tenantID uuid.UUID, name, corrID string) (*Instance, error) {
	if corrID == "" {
		return nil, nil
	}
	var inst Instance
	err := o.DB.GetContext(ctx, &inst,
		`SELECT id, tenant_id, saga_name, correlation_id, aggregate_id, current_step,
		        total_steps, status, payload, last_error, created_at, updated_at, completed_at
		 FROM app.saga_instances
		 WHERE tenant_id = $1 AND saga_name = $2 AND correlation_id = $3`,
		tenantID, name, corrID)
	if err != nil {
		if errors.Is(err, sqlxNoRows{}) || err.Error() == "sql: no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("saga: find existing: %w", err)
	}
	return &inst, nil
}

// sqlxNoRows is a tiny sentinel matcher for "no rows" without importing database/sql.
type sqlxNoRows struct{}

func (sqlxNoRows) Error() string { return "sql: no rows in result set" }

func (o *Orchestrator) insert(ctx context.Context, def Definition, state State) (*Instance, error) {
	payload, _ := json.Marshal(state.Data)
	var corrPtr *string
	if state.CorrelationID != "" {
		c := state.CorrelationID
		corrPtr = &c
	}
	var inst Instance
	err := o.DB.GetContext(ctx, &inst,
		`INSERT INTO app.saga_instances
			(tenant_id, saga_name, correlation_id, aggregate_id, total_steps, payload)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, saga_name, correlation_id, aggregate_id, current_step,
		           total_steps, status, payload, last_error, created_at, updated_at, completed_at`,
		state.TenantID, def.Name, corrPtr, state.AggregateID, len(def.Steps), payload)
	if err != nil {
		return nil, fmt.Errorf("saga: insert instance: %w", err)
	}
	return &inst, nil
}

func (o *Orchestrator) beginStep(
	ctx context.Context, instanceID uuid.UUID, index int, name, direction string, state State,
) (uuid.UUID, error) {
	reqBody, _ := json.Marshal(state.Data)
	var id uuid.UUID
	err := o.DB.GetContext(ctx, &id,
		`INSERT INTO app.saga_steps
			(saga_instance_id, step_index, step_name, direction, status, attempts, request_payload, started_at)
		 VALUES ($1, $2, $3, $4, 'pending', 1, $5, NOW())
		 RETURNING id`,
		instanceID, index, name, direction, reqBody)
	if err != nil {
		return uuid.Nil, fmt.Errorf("saga: begin step: %w", err)
	}
	return id, nil
}

func (o *Orchestrator) succeedStep(ctx context.Context, stepID uuid.UUID, resp any) error {
	respBody, _ := json.Marshal(resp)
	_, err := o.DB.ExecContext(ctx,
		`UPDATE app.saga_steps SET status='success', response_payload=$2, finished_at=NOW() WHERE id=$1`,
		stepID, respBody)
	return err
}

func (o *Orchestrator) failStep(ctx context.Context, stepID uuid.UUID, stepErr error) error {
	_, err := o.DB.ExecContext(ctx,
		`UPDATE app.saga_steps SET status='failed', error_message=$2, finished_at=NOW() WHERE id=$1`,
		stepID, stepErr.Error())
	return err
}

func (o *Orchestrator) advanceStep(ctx context.Context, instanceID uuid.UUID, nextStep int) error {
	_, err := o.DB.ExecContext(ctx,
		`UPDATE app.saga_instances SET current_step=$2, updated_at=NOW() WHERE id=$1`,
		instanceID, nextStep)
	return err
}

func (o *Orchestrator) setInstanceStatus(ctx context.Context, instanceID uuid.UUID, status, errMsg string) error {
	completedAt := "NULL"
	if status == "completed" || status == "compensated" || status == "failed" {
		completedAt = "NOW()"
	}
	q := fmt.Sprintf(
		`UPDATE app.saga_instances
		 SET status=$2, last_error=NULLIF($3,''), updated_at=NOW(), completed_at=%s
		 WHERE id=$1`, completedAt)
	_, err := o.DB.ExecContext(ctx, q, instanceID, status, errMsg)
	return err
}

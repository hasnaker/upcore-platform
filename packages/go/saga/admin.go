package saga

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// AdminRepository exposes saga state to operators.
type AdminRepository interface {
	Stats(ctx context.Context, tenantID uuid.UUID) (*AdminStats, error)
	List(ctx context.Context, tenantID uuid.UUID, status, sagaName string, limit, offset int) ([]*Instance, int, error)
	Get(ctx context.Context, tenantID, id uuid.UUID) (*Instance, []*StepRecord, error)
	MarkForRetry(ctx context.Context, tenantID, id uuid.UUID) error
	Cancel(ctx context.Context, tenantID, id uuid.UUID) error
}

// AdminStats aggregates instance counts per status for dashboards.
type AdminStats struct {
	Running      int `json:"running"`
	Completed    int `json:"completed"`
	Failed       int `json:"failed"`
	Compensating int `json:"compensating"`
	Compensated  int `json:"compensated"`
	Total        int `json:"total"`
}

// StepRecord mirrors app.saga_steps for admin queries.
type StepRecord struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	SagaInstanceID   uuid.UUID  `db:"saga_instance_id" json:"saga_instance_id"`
	StepIndex        int        `db:"step_index" json:"step_index"`
	StepName         string     `db:"step_name" json:"step_name"`
	Direction        string     `db:"direction" json:"direction"`
	Status           string     `db:"status" json:"status"`
	Attempts         int        `db:"attempts" json:"attempts"`
	RequestPayload   []byte     `db:"request_payload" json:"-"`
	ResponsePayload  []byte     `db:"response_payload" json:"-"`
	ErrorMessage     *string    `db:"error_message" json:"error_message,omitempty"`
	StartedAt        *time.Time `db:"started_at" json:"started_at,omitempty"`
	FinishedAt       *time.Time `db:"finished_at" json:"finished_at,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
}

type adminRepo struct{ db *sqlx.DB }

// NewAdminRepository constructs the repository.
func NewAdminRepository(d *sqlx.DB) AdminRepository { return &adminRepo{db: d} }

func (r *adminRepo) Stats(ctx context.Context, tenantID uuid.UUID) (*AdminStats, error) {
	s := &AdminStats{}
	q := `SELECT
		COUNT(*) FILTER (WHERE status='running')      AS running,
		COUNT(*) FILTER (WHERE status='completed')    AS completed,
		COUNT(*) FILTER (WHERE status='failed')       AS failed,
		COUNT(*) FILTER (WHERE status='compensating') AS compensating,
		COUNT(*) FILTER (WHERE status='compensated')  AS compensated,
		COUNT(*)                                      AS total
	FROM app.saga_instances WHERE tenant_id = $1`
	if err := r.db.QueryRowxContext(ctx, q, tenantID).
		Scan(&s.Running, &s.Completed, &s.Failed, &s.Compensating, &s.Compensated, &s.Total); err != nil {
		return nil, fmt.Errorf("saga stats: %w", err)
	}
	return s, nil
}

func (r *adminRepo) List(ctx context.Context, tenantID uuid.UUID, status, sagaName string, limit, offset int) ([]*Instance, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	conds := "tenant_id = $1"
	args := []any{tenantID}
	i := 2
	if status != "" {
		conds += fmt.Sprintf(" AND status = $%d", i)
		args = append(args, status)
		i++
	}
	if sagaName != "" {
		conds += fmt.Sprintf(" AND saga_name = $%d", i)
		args = append(args, sagaName)
		i++
	}

	var total int
	if err := r.db.GetContext(ctx, &total,
		`SELECT COUNT(*) FROM app.saga_instances WHERE `+conds, args...); err != nil {
		return nil, 0, fmt.Errorf("saga count: %w", err)
	}

	q := `SELECT id, tenant_id, saga_name, correlation_id, aggregate_id, current_step,
	             total_steps, status, payload, last_error, created_at, updated_at, completed_at
	      FROM app.saga_instances WHERE ` + conds +
		fmt.Sprintf(" ORDER BY updated_at DESC LIMIT $%d OFFSET $%d", i, i+1)
	args = append(args, limit, offset)

	rows := []*Instance{}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, 0, fmt.Errorf("saga list: %w", err)
	}
	return rows, total, nil
}

func (r *adminRepo) Get(ctx context.Context, tenantID, id uuid.UUID) (*Instance, []*StepRecord, error) {
	var inst Instance
	if err := r.db.GetContext(ctx, &inst,
		`SELECT id, tenant_id, saga_name, correlation_id, aggregate_id, current_step,
		        total_steps, status, payload, last_error, created_at, updated_at, completed_at
		 FROM app.saga_instances WHERE tenant_id = $1 AND id = $2`,
		tenantID, id); err != nil {
		return nil, nil, fmt.Errorf("saga get: %w", err)
	}
	steps := []*StepRecord{}
	if err := r.db.SelectContext(ctx, &steps,
		`SELECT id, saga_instance_id, step_index, step_name, direction, status, attempts,
		        request_payload, response_payload, error_message, started_at, finished_at, created_at
		 FROM app.saga_steps WHERE saga_instance_id = $1 ORDER BY created_at, step_index`,
		id); err != nil {
		return nil, nil, fmt.Errorf("saga steps: %w", err)
	}
	return &inst, steps, nil
}

// MarkForRetry resets a failed/compensated saga so the orchestrator can
// resume it on the next Start() call with the same correlation_id. The
// orchestrator's idempotency check will no longer short-circuit.
func (r *adminRepo) MarkForRetry(ctx context.Context, tenantID, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE app.saga_instances
		 SET status = 'running', last_error = NULL, updated_at = NOW(), completed_at = NULL
		 WHERE tenant_id = $1 AND id = $2 AND status IN ('failed', 'compensated')`,
		tenantID, id)
	if err != nil {
		return fmt.Errorf("saga retry: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("saga retry: instance not found or not in retryable state")
	}
	return nil
}

// Cancel marks a running/compensating saga as failed. Does NOT run compensation.
func (r *adminRepo) Cancel(ctx context.Context, tenantID, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE app.saga_instances
		 SET status = 'failed', last_error = 'operator cancelled', updated_at = NOW(), completed_at = NOW()
		 WHERE tenant_id = $1 AND id = $2 AND status IN ('running', 'compensating')`,
		tenantID, id)
	if err != nil {
		return fmt.Errorf("saga cancel: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("saga cancel: instance not found or not active")
	}
	return nil
}

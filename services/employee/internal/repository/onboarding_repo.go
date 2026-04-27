package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/upcore/employee/internal/db"
	"github.com/upcore/employee/internal/domain"
)

// OnboardingRepository abstracts app.onboarding_checklists + onboarding_tasks.
type OnboardingRepository interface {
	CreateWithTasks(ctx context.Context, c *domain.OnboardingChecklist, tasks []domain.OnboardingTask) error
	GetByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.OnboardingChecklist, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OnboardingChecklist, error)
	List(ctx context.Context, tenantID uuid.UUID, status string, limit, offset int) ([]*domain.OnboardingChecklist, int, error)
	ListTasks(ctx context.Context, tenantID, checklistID uuid.UUID) ([]domain.OnboardingTask, error)
	UpdateChecklistStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.OnboardingStatus, pct int) error
	UpdateTask(ctx context.Context, tenantID uuid.UUID, t *domain.OnboardingTask) error
	GetTask(ctx context.Context, tenantID, taskID uuid.UUID) (*domain.OnboardingTask, error)
}

type onboardingRepo struct {
	db *sqlx.DB
}

// NewOnboardingRepository constructs an OnboardingRepository.
func NewOnboardingRepository(d *sqlx.DB) OnboardingRepository {
	return &onboardingRepo{db: d}
}

const checklistCols = `id, tenant_id, employee_id, template_name, start_date,
	status, completion_pct, created_at, updated_at`

const taskCols = `id, checklist_id, task_code, task_title_tr, task_description,
	owner_role, owner_user_id, due_at, due_days_offset, status,
	completed_at, notes, order_index, created_at, updated_at`

const qInsertChecklist = `
INSERT INTO app.onboarding_checklists (
	id, tenant_id, employee_id, template_name, start_date, status, completion_pct, created_at, updated_at
) VALUES (
	:id, :tenant_id, :employee_id, :template_name, :start_date, :status, :completion_pct, :created_at, :updated_at
)`

const qInsertTask = `
INSERT INTO app.onboarding_tasks (
	id, checklist_id, task_code, task_title_tr, task_description,
	owner_role, owner_user_id, due_at, due_days_offset, status,
	completed_at, notes, order_index, created_at, updated_at
) VALUES (
	:id, :checklist_id, :task_code, :task_title_tr, :task_description,
	:owner_role, :owner_user_id, :due_at, :due_days_offset, :status,
	:completed_at, :notes, :order_index, :created_at, :updated_at
)`

// CreateWithTasks inserts a checklist and its tasks atomically.
func (r *onboardingRepo) CreateWithTasks(ctx context.Context, c *domain.OnboardingChecklist, tasks []domain.OnboardingTask) error {
	c.ApplyDefaults()
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, c.TenantID); err != nil {
		return err
	}

	if _, err := tx.NamedExecContext(ctx, qInsertChecklist, c); err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return domain.ErrOnboardingExists
		}
		return fmt.Errorf("insert checklist: %w", err)
	}

	for i := range tasks {
		if tasks[i].ID == uuid.Nil {
			tasks[i].ID = uuid.New()
		}
		tasks[i].ChecklistID = c.ID
		if tasks[i].CreatedAt.IsZero() {
			tasks[i].CreatedAt = now
		}
		tasks[i].UpdatedAt = now
		if tasks[i].Status == "" {
			tasks[i].Status = domain.TaskPending
		}
		if _, err := tx.NamedExecContext(ctx, qInsertTask, tasks[i]); err != nil {
			return fmt.Errorf("insert task %s: %w", tasks[i].TaskCode, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	c.Tasks = tasks
	return nil
}

// GetByEmployee returns the active checklist for an employee (at most one per UNIQUE constraint).
func (r *onboardingRepo) GetByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.OnboardingChecklist, error) {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return nil, err
	}
	var c domain.OnboardingChecklist
	q := `SELECT ` + checklistCols + ` FROM app.onboarding_checklists WHERE tenant_id = $1 AND employee_id = $2`
	if err := tx.GetContext(ctx, &c, q, tenantID, employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOnboardingNotFound
		}
		return nil, fmt.Errorf("select checklist: %w", err)
	}
	tasks, err := selectTasksTx(ctx, tx, c.ID)
	if err != nil {
		return nil, err
	}
	c.Tasks = tasks
	return &c, nil
}

// GetByID returns a checklist by ID (with tasks).
func (r *onboardingRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OnboardingChecklist, error) {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return nil, err
	}
	var c domain.OnboardingChecklist
	q := `SELECT ` + checklistCols + ` FROM app.onboarding_checklists WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &c, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOnboardingNotFound
		}
		return nil, fmt.Errorf("select checklist: %w", err)
	}
	tasks, err := selectTasksTx(ctx, tx, c.ID)
	if err != nil {
		return nil, err
	}
	c.Tasks = tasks
	return &c, nil
}

// List returns a page of checklists plus total count.
func (r *onboardingRepo) List(ctx context.Context, tenantID uuid.UUID, status string, limit, offset int) ([]*domain.OnboardingChecklist, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return nil, 0, err
	}

	conds := []string{"tenant_id = $1"}
	args := []any{tenantID}
	i := 2
	if s := strings.TrimSpace(status); s != "" {
		conds = append(conds, fmt.Sprintf("status = $%d", i))
		args = append(args, s)
		i++
	}
	where := strings.Join(conds, " AND ")

	var total int
	if err := tx.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.onboarding_checklists WHERE "+where, args...); err != nil {
		return nil, 0, fmt.Errorf("count checklists: %w", err)
	}

	q := fmt.Sprintf(
		"SELECT %s FROM app.onboarding_checklists WHERE %s ORDER BY start_date DESC LIMIT $%d OFFSET $%d",
		checklistCols, where, i, i+1,
	)
	args = append(args, limit, offset)

	out := []*domain.OnboardingChecklist{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list checklists: %w", err)
	}
	return out, total, nil
}

// ListTasks returns all tasks for a checklist (tenant-scoped via parent lookup).
func (r *onboardingRepo) ListTasks(ctx context.Context, tenantID, checklistID uuid.UUID) ([]domain.OnboardingTask, error) {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return nil, err
	}
	return selectTasksTx(ctx, tx, checklistID)
}

// UpdateChecklistStatus persists the parent status + completion %.
func (r *onboardingRepo) UpdateChecklistStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.OnboardingStatus, pct int) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx,
		`UPDATE app.onboarding_checklists
		 SET status = $3, completion_pct = $4, updated_at = NOW()
		 WHERE tenant_id = $1 AND id = $2`,
		tenantID, id, string(status), pct,
	)
	if err != nil {
		return fmt.Errorf("update checklist: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrOnboardingNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// GetTask returns a task scoped by tenant (joined via checklist).
func (r *onboardingRepo) GetTask(ctx context.Context, tenantID, taskID uuid.UUID) (*domain.OnboardingTask, error) {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return nil, err
	}
	var t domain.OnboardingTask
	q := `SELECT t.id, t.checklist_id, t.task_code, t.task_title_tr, t.task_description,
		t.owner_role, t.owner_user_id, t.due_at, t.due_days_offset, t.status,
		t.completed_at, t.notes, t.order_index, t.created_at, t.updated_at
		FROM app.onboarding_tasks t
		JOIN app.onboarding_checklists c ON c.id = t.checklist_id
		WHERE c.tenant_id = $1 AND t.id = $2`
	if err := tx.GetContext(ctx, &t, q, tenantID, taskID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOnboardingTaskNotFound
		}
		return nil, fmt.Errorf("select task: %w", err)
	}
	return &t, nil
}

// UpdateTask persists task status/owner/notes changes.
func (r *onboardingRepo) UpdateTask(ctx context.Context, tenantID uuid.UUID, t *domain.OnboardingTask) error {
	t.UpdatedAt = time.Now().UTC()
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx,
		`UPDATE app.onboarding_tasks
		 SET status = $2, owner_user_id = $3, completed_at = $4, notes = $5, updated_at = $6
		 WHERE id = $1`,
		t.ID, string(t.Status), t.OwnerUserID, t.CompletedAt, t.Notes, t.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("update task: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrOnboardingTaskNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func selectTasksTx(ctx context.Context, tx *sqlx.Tx, checklistID uuid.UUID) ([]domain.OnboardingTask, error) {
	out := []domain.OnboardingTask{}
	q := `SELECT ` + taskCols + ` FROM app.onboarding_tasks WHERE checklist_id = $1 ORDER BY order_index, due_at`
	if err := tx.SelectContext(ctx, &out, q, checklistID); err != nil {
		return nil, fmt.Errorf("select tasks: %w", err)
	}
	return out, nil
}

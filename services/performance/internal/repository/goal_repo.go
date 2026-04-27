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

	"github.com/upcore/performance/internal/domain"
)

// GoalRepository abstracts app.performance_goals.
type GoalRepository interface {
	Create(ctx context.Context, g *domain.PerformanceGoal) error
	Update(ctx context.Context, g *domain.PerformanceGoal) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceGoal, error)
	List(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID, status string) ([]*domain.PerformanceGoal, error)
}

type goalRepo struct{ db *sqlx.DB }

// NewGoalRepository constructs the repository.
func NewGoalRepository(d *sqlx.DB) GoalRepository { return &goalRepo{db: d} }

const goalCols = `id, tenant_id, cycle_id, employee_id, category, title_tr, description,
	metric_type, target_value, current_value, unit, weight_pct, due_date, status,
	progress_pct, aligned_with_id, manager_id, metadata, created_at, updated_at`

func (r *goalRepo) Create(ctx context.Context, g *domain.PerformanceGoal) error {
	g.ApplyDefaults()
	now := time.Now().UTC()
	if g.CreatedAt.IsZero() {
		g.CreatedAt = now
	}
	g.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, g.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.performance_goals (
		id, tenant_id, cycle_id, employee_id, category, title_tr, description,
		metric_type, target_value, current_value, unit, weight_pct, due_date, status,
		progress_pct, aligned_with_id, manager_id, metadata, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :cycle_id, :employee_id, :category, :title_tr, :description,
		:metric_type, :target_value, :current_value, :unit, :weight_pct, :due_date, :status,
		:progress_pct, :aligned_with_id, :manager_id, :metadata, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, g); err != nil {
		return fmt.Errorf("insert goal: %w", err)
	}
	return tx.Commit()
}

func (r *goalRepo) Update(ctx context.Context, g *domain.PerformanceGoal) error {
	g.UpdatedAt = time.Now().UTC()
	tx, err := beginTenantTx(ctx, r.db, g.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.performance_goals SET
			category = :category, title_tr = :title_tr, description = :description,
			metric_type = :metric_type, target_value = :target_value, current_value = :current_value,
			unit = :unit, weight_pct = :weight_pct, due_date = :due_date, status = :status,
			progress_pct = :progress_pct, aligned_with_id = :aligned_with_id, manager_id = :manager_id,
			metadata = :metadata, updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, g)
	if err != nil {
		return fmt.Errorf("update goal: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *goalRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceGoal, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var g domain.PerformanceGoal
	q := `SELECT ` + goalCols + ` FROM app.performance_goals WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &g, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select goal: %w", err)
	}
	return &g, nil
}

func (r *goalRepo) List(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID, status string) ([]*domain.PerformanceGoal, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	conds := []string{"tenant_id = $1"}
	args := []any{tenantID}
	i := 2
	if cycleID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("cycle_id = $%d", i))
		args = append(args, cycleID)
		i++
	}
	if employeeID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("employee_id = $%d", i))
		args = append(args, employeeID)
		i++
	}
	if s := strings.TrimSpace(status); s != "" {
		conds = append(conds, fmt.Sprintf("status = $%d", i))
		args = append(args, s)
		i++
	}
	q := fmt.Sprintf("SELECT %s FROM app.performance_goals WHERE %s ORDER BY due_date NULLS LAST, created_at DESC",
		goalCols, strings.Join(conds, " AND "))
	out := []*domain.PerformanceGoal{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list goals: %w", err)
	}
	return out, nil
}

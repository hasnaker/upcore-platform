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

// CycleRepository abstracts app.performance_cycles.
type CycleRepository interface {
	Create(ctx context.Context, c *domain.PerformanceCycle) error
	Update(ctx context.Context, c *domain.PerformanceCycle) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceCycle, error)
	List(ctx context.Context, tenantID uuid.UUID, status string, limit, offset int) ([]*domain.PerformanceCycle, int, error)
}

type cycleRepo struct{ db *sqlx.DB }

// NewCycleRepository constructs the repository.
func NewCycleRepository(d *sqlx.DB) CycleRepository { return &cycleRepo{db: d} }

const cycleCols = `id, tenant_id, name_tr, cycle_type, period_start, period_end,
	goal_setting_start, goal_setting_end, review_start, review_end,
	status, description, created_by, created_at, updated_at`

func (r *cycleRepo) Create(ctx context.Context, c *domain.PerformanceCycle) error {
	c.ApplyDefaults()
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, c.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.performance_cycles (
		id, tenant_id, name_tr, cycle_type, period_start, period_end,
		goal_setting_start, goal_setting_end, review_start, review_end,
		status, description, created_by, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :name_tr, :cycle_type, :period_start, :period_end,
		:goal_setting_start, :goal_setting_end, :review_start, :review_end,
		:status, :description, :created_by, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, c); err != nil {
		return fmt.Errorf("insert cycle: %w", err)
	}
	return tx.Commit()
}

func (r *cycleRepo) Update(ctx context.Context, c *domain.PerformanceCycle) error {
	c.UpdatedAt = time.Now().UTC()
	tx, err := beginTenantTx(ctx, r.db, c.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.performance_cycles SET
			name_tr = :name_tr, cycle_type = :cycle_type,
			period_start = :period_start, period_end = :period_end,
			goal_setting_start = :goal_setting_start, goal_setting_end = :goal_setting_end,
			review_start = :review_start, review_end = :review_end,
			status = :status, description = :description,
			updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, c)
	if err != nil {
		return fmt.Errorf("update cycle: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *cycleRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceCycle, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var c domain.PerformanceCycle
	q := `SELECT ` + cycleCols + ` FROM app.performance_cycles WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &c, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select cycle: %w", err)
	}
	return &c, nil
}

func (r *cycleRepo) List(ctx context.Context, tenantID uuid.UUID, status string, limit, offset int) ([]*domain.PerformanceCycle, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = tx.Rollback() }()
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
	if err := tx.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.performance_cycles WHERE "+where, args...); err != nil {
		return nil, 0, fmt.Errorf("count cycle: %w", err)
	}
	q := fmt.Sprintf("SELECT %s FROM app.performance_cycles WHERE %s ORDER BY period_start DESC LIMIT $%d OFFSET $%d",
		cycleCols, where, i, i+1)
	args = append(args, limit, offset)
	out := []*domain.PerformanceCycle{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list cycles: %w", err)
	}
	return out, total, nil
}

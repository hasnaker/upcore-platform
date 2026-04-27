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

// NineBoxRepository abstracts app.nine_box_assignments.
type NineBoxRepository interface {
	Upsert(ctx context.Context, a *domain.NineBoxAssignment) error
	GetByCycleEmployee(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID) (*domain.NineBoxAssignment, error)
	List(ctx context.Context, tenantID, cycleID uuid.UUID, segment string) ([]*domain.NineBoxAssignment, error)
}

type nineBoxRepo struct{ db *sqlx.DB }

// NewNineBoxRepository constructs the repository.
func NewNineBoxRepository(d *sqlx.DB) NineBoxRepository { return &nineBoxRepo{db: d} }

const nineBoxCols = `id, tenant_id, cycle_id, employee_id, performance_band, potential_band,
	box_label, talent_segment, calibration_notes, recommended_action, set_by, calibrated_at,
	created_at, updated_at`

func (r *nineBoxRepo) Upsert(ctx context.Context, a *domain.NineBoxAssignment) error {
	a.ApplyDefaults()
	now := time.Now().UTC()
	if a.CreatedAt.IsZero() {
		a.CreatedAt = now
	}
	a.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, a.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.nine_box_assignments (
		id, tenant_id, cycle_id, employee_id, performance_band, potential_band,
		box_label, talent_segment, calibration_notes, recommended_action, set_by, calibrated_at,
		created_at, updated_at
	) VALUES (
		:id, :tenant_id, :cycle_id, :employee_id, :performance_band, :potential_band,
		:box_label, :talent_segment, :calibration_notes, :recommended_action, :set_by, :calibrated_at,
		:created_at, :updated_at
	) ON CONFLICT (tenant_id, cycle_id, employee_id) DO UPDATE SET
		performance_band = EXCLUDED.performance_band,
		potential_band = EXCLUDED.potential_band,
		box_label = EXCLUDED.box_label,
		talent_segment = EXCLUDED.talent_segment,
		calibration_notes = EXCLUDED.calibration_notes,
		recommended_action = EXCLUDED.recommended_action,
		set_by = EXCLUDED.set_by,
		calibrated_at = EXCLUDED.calibrated_at,
		updated_at = EXCLUDED.updated_at`
	if _, err := tx.NamedExecContext(ctx, q, a); err != nil {
		return fmt.Errorf("upsert nine box: %w", err)
	}
	return tx.Commit()
}

func (r *nineBoxRepo) GetByCycleEmployee(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID) (*domain.NineBoxAssignment, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var a domain.NineBoxAssignment
	q := `SELECT ` + nineBoxCols + ` FROM app.nine_box_assignments WHERE tenant_id = $1 AND cycle_id = $2 AND employee_id = $3`
	if err := tx.GetContext(ctx, &a, q, tenantID, cycleID, employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select nine box: %w", err)
	}
	return &a, nil
}

func (r *nineBoxRepo) List(ctx context.Context, tenantID, cycleID uuid.UUID, segment string) ([]*domain.NineBoxAssignment, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	conds := []string{"tenant_id = $1", "cycle_id = $2"}
	args := []any{tenantID, cycleID}
	if s := strings.TrimSpace(segment); s != "" {
		conds = append(conds, "talent_segment = $3")
		args = append(args, s)
	}
	q := fmt.Sprintf("SELECT %s FROM app.nine_box_assignments WHERE %s",
		nineBoxCols, strings.Join(conds, " AND "))
	out := []*domain.NineBoxAssignment{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list nine box: %w", err)
	}
	return out, nil
}

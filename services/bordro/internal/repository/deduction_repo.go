package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// EmployeeDeduction mirrors app.employee_deductions.
type EmployeeDeduction struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	EmployeeID     uuid.UUID  `db:"employee_id" json:"employee_id"`
	DeductionType  string     `db:"deduction_type" json:"deduction_type"`
	Label          string     `db:"label" json:"label"`
	MonthlyAmount  float64    `db:"monthly_amount" json:"monthly_amount"`
	TotalCap       *float64   `db:"total_cap" json:"total_cap,omitempty"`
	Consumed       float64    `db:"consumed" json:"consumed"`
	StartPeriod    string     `db:"start_period" json:"start_period"`
	EndPeriod      *string    `db:"end_period" json:"end_period,omitempty"`
	ReferenceNo    *string    `db:"reference_no" json:"reference_no,omitempty"`
	Priority       int        `db:"priority" json:"priority"`
	Active         bool       `db:"active" json:"active"`
	Notes          *string    `db:"notes" json:"notes,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// DeductionRepository abstracts persistence for employee_deductions.
type DeductionRepository interface {
	Create(ctx context.Context, d *EmployeeDeduction) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*EmployeeDeduction, error)
	List(ctx context.Context, tenantID, employeeID uuid.UUID, activeOnly bool) ([]*EmployeeDeduction, error)
	Update(ctx context.Context, d *EmployeeDeduction) error
	Deactivate(ctx context.Context, tenantID, id uuid.UUID) error
	IncrementConsumed(ctx context.Context, tenantID, id uuid.UUID, amount float64) error
	// ListActiveForPeriod: employee'ye ait, belirtilen dönemde active kesintiler.
	ListActiveForPeriod(ctx context.Context, tenantID, employeeID uuid.UUID, period string) ([]*EmployeeDeduction, error)
}

type deductionRepo struct{ db *sqlx.DB }

// NewDeductionRepository constructs the repo.
func NewDeductionRepository(d *sqlx.DB) DeductionRepository {
	return &deductionRepo{db: d}
}

const deductionCols = `id, tenant_id, employee_id, deduction_type, label,
	monthly_amount, total_cap, consumed, start_period, end_period,
	reference_no, priority, active, notes, created_at, updated_at`

func (r *deductionRepo) Create(ctx context.Context, d *EmployeeDeduction) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	now := time.Now().UTC()
	if d.CreatedAt.IsZero() {
		d.CreatedAt = now
	}
	d.UpdatedAt = now
	tx, err := beginTx(ctx, r.db, d.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.employee_deductions (
		id, tenant_id, employee_id, deduction_type, label,
		monthly_amount, total_cap, consumed, start_period, end_period,
		reference_no, priority, active, notes
	) VALUES (
		:id, :tenant_id, :employee_id, :deduction_type, :label,
		:monthly_amount, :total_cap, :consumed, :start_period, :end_period,
		:reference_no, :priority, :active, :notes
	)`
	if _, err := tx.NamedExecContext(ctx, q, d); err != nil {
		return fmt.Errorf("insert deduction: %w", err)
	}
	return tx.Commit()
}

func (r *deductionRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*EmployeeDeduction, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var d EmployeeDeduction
	q := `SELECT ` + deductionCols + ` FROM app.employee_deductions WHERE tenant_id=$1 AND id=$2`
	if err := tx.GetContext(ctx, &d, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("deduction not found")
		}
		return nil, fmt.Errorf("get deduction: %w", err)
	}
	return &d, nil
}

func (r *deductionRepo) List(ctx context.Context, tenantID, employeeID uuid.UUID, activeOnly bool) ([]*EmployeeDeduction, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + deductionCols + ` FROM app.employee_deductions
	      WHERE tenant_id=$1 AND employee_id=$2`
	if activeOnly {
		q += ` AND active = TRUE`
	}
	q += ` ORDER BY priority, created_at DESC`
	out := []*EmployeeDeduction{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list deductions: %w", err)
	}
	return out, nil
}

func (r *deductionRepo) Update(ctx context.Context, d *EmployeeDeduction) error {
	d.UpdatedAt = time.Now().UTC()
	tx, err := beginTx(ctx, r.db, d.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `UPDATE app.employee_deductions SET
		deduction_type=:deduction_type, label=:label,
		monthly_amount=:monthly_amount, total_cap=:total_cap,
		start_period=:start_period, end_period=:end_period,
		reference_no=:reference_no, priority=:priority, active=:active,
		notes=:notes, updated_at=:updated_at
	WHERE tenant_id=:tenant_id AND id=:id`
	if _, err := tx.NamedExecContext(ctx, q, d); err != nil {
		return fmt.Errorf("update deduction: %w", err)
	}
	return tx.Commit()
}

func (r *deductionRepo) Deactivate(ctx context.Context, tenantID, id uuid.UUID) error {
	tx, err := beginTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx,
		`UPDATE app.employee_deductions SET active=FALSE, updated_at=NOW()
		 WHERE tenant_id=$1 AND id=$2`, tenantID, id); err != nil {
		return fmt.Errorf("deactivate: %w", err)
	}
	return tx.Commit()
}

func (r *deductionRepo) IncrementConsumed(ctx context.Context, tenantID, id uuid.UUID, amount float64) error {
	tx, err := beginTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx,
		`UPDATE app.employee_deductions
		 SET consumed = consumed + $3,
		     active   = CASE WHEN total_cap IS NOT NULL AND consumed + $3 >= total_cap THEN FALSE ELSE active END,
		     updated_at = NOW()
		 WHERE tenant_id=$1 AND id=$2`, tenantID, id, amount); err != nil {
		return fmt.Errorf("increment consumed: %w", err)
	}
	return tx.Commit()
}

func (r *deductionRepo) ListActiveForPeriod(ctx context.Context, tenantID, employeeID uuid.UUID, period string) ([]*EmployeeDeduction, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + deductionCols + ` FROM app.employee_deductions
	      WHERE tenant_id=$1 AND employee_id=$2 AND active = TRUE
	        AND start_period <= $3
	        AND (end_period IS NULL OR end_period >= $3)
	      ORDER BY priority`
	out := []*EmployeeDeduction{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, employeeID, period); err != nil {
		return nil, fmt.Errorf("list active deductions: %w", err)
	}
	return out, nil
}

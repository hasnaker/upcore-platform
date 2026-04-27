// Package repository persists bordro aggregates.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/upcore/bordrosvc/internal/db"
	"github.com/upcore/bordrosvc/internal/domain"
)

func beginTx(ctx context.Context, d *sqlx.DB, tenantID uuid.UUID, readOnly bool) (*sqlx.Tx, error) {
	var opts *sql.TxOptions
	if readOnly {
		opts = &sql.TxOptions{ReadOnly: true}
	}
	tx, err := d.BeginTxx(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		_ = tx.Rollback()
		return nil, err
	}
	return tx, nil
}

// ============================================================================
// Period Repository
// ============================================================================

// PeriodRepository abstracts app.payroll_periods.
type PeriodRepository interface {
	Create(ctx context.Context, p *domain.Period) error
	Update(ctx context.Context, p *domain.Period) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Period, error)
	GetByYearMonth(ctx context.Context, tenantID uuid.UUID, year, month int) (*domain.Period, error)
	List(ctx context.Context, tenantID uuid.UUID, year int, limit, offset int) ([]*domain.Period, int, error)
}

type periodRepo struct{ db *sqlx.DB }

// NewPeriodRepository constructs the repo.
func NewPeriodRepository(d *sqlx.DB) PeriodRepository { return &periodRepo{db: d} }

const periodCols = `id, tenant_id, period_year, period_month, start_date, end_date,
	pay_date, status, created_by, created_at, updated_at`

func (r *periodRepo) Create(ctx context.Context, p *domain.Period) error {
	p.ApplyDefaults()
	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	p.UpdatedAt = now
	tx, err := beginTx(ctx, r.db, p.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.payroll_periods (
		id, tenant_id, period_year, period_month, start_date, end_date,
		pay_date, status, created_by, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :period_year, :period_month, :start_date, :end_date,
		:pay_date, :status, :created_by, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, p); err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("insert period: %w", err)
	}
	return tx.Commit()
}

func (r *periodRepo) Update(ctx context.Context, p *domain.Period) error {
	p.UpdatedAt = time.Now().UTC()
	tx, err := beginTx(ctx, r.db, p.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.payroll_periods SET
			start_date = :start_date, end_date = :end_date, pay_date = :pay_date,
			status = :status, updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, p)
	if err != nil {
		return fmt.Errorf("update period: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *periodRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Period, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var p domain.Period
	q := `SELECT ` + periodCols + ` FROM app.payroll_periods WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &p, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select period: %w", err)
	}
	return &p, nil
}

func (r *periodRepo) GetByYearMonth(ctx context.Context, tenantID uuid.UUID, year, month int) (*domain.Period, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var p domain.Period
	q := `SELECT ` + periodCols + ` FROM app.payroll_periods
	      WHERE tenant_id = $1 AND period_year = $2 AND period_month = $3`
	if err := tx.GetContext(ctx, &p, q, tenantID, year, month); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select period: %w", err)
	}
	return &p, nil
}

func (r *periodRepo) List(ctx context.Context, tenantID uuid.UUID, year int, limit, offset int) ([]*domain.Period, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 24
	}
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = tx.Rollback() }()
	conds := "tenant_id = $1"
	args := []any{tenantID}
	if year > 0 {
		conds += " AND period_year = $2"
		args = append(args, year)
	}
	var total int
	if err := tx.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.payroll_periods WHERE "+conds, args...); err != nil {
		return nil, 0, fmt.Errorf("count: %w", err)
	}
	q := fmt.Sprintf("SELECT %s FROM app.payroll_periods WHERE %s ORDER BY period_year DESC, period_month DESC LIMIT $%d OFFSET $%d",
		periodCols, conds, len(args)+1, len(args)+2)
	args = append(args, limit, offset)
	out := []*domain.Period{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list: %w", err)
	}
	return out, total, nil
}

// ============================================================================
// Run Repository
// ============================================================================

// RunRepository abstracts app.payroll_runs.
type RunRepository interface {
	Create(ctx context.Context, r *domain.Run) error
	Update(ctx context.Context, r *domain.Run) error
	UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.RunStatus, approverID *uuid.UUID) error
	UpdateTotals(ctx context.Context, tenantID, id uuid.UUID, gross, net, incomeTax, sgkEmp, sgkEmpr, stamp float64, employees int) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Run, error)
	List(ctx context.Context, tenantID, periodID uuid.UUID) ([]*domain.Run, error)
}

type runRepo struct{ db *sqlx.DB }

// NewRunRepository constructs the repo.
func NewRunRepository(d *sqlx.DB) RunRepository { return &runRepo{db: d} }

const runCols = `id, tenant_id, period_id, run_type, status,
	total_gross, total_net, total_income_tax, total_sgk_emp, total_sgk_empr, total_stamp,
	employee_count, approved_by, approved_at, finalised_at, notes, created_at, updated_at`

func (r *runRepo) Create(ctx context.Context, run *domain.Run) error {
	run.ApplyDefaults()
	now := time.Now().UTC()
	if run.CreatedAt.IsZero() {
		run.CreatedAt = now
	}
	run.UpdatedAt = now
	tx, err := beginTx(ctx, r.db, run.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.payroll_runs (
		id, tenant_id, period_id, run_type, status,
		total_gross, total_net, total_income_tax, total_sgk_emp, total_sgk_empr, total_stamp,
		employee_count, approved_by, approved_at, finalised_at, notes, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :period_id, :run_type, :status,
		:total_gross, :total_net, :total_income_tax, :total_sgk_emp, :total_sgk_empr, :total_stamp,
		:employee_count, :approved_by, :approved_at, :finalised_at, :notes, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, run); err != nil {
		return fmt.Errorf("insert run: %w", err)
	}
	return tx.Commit()
}

func (r *runRepo) Update(ctx context.Context, run *domain.Run) error {
	run.UpdatedAt = time.Now().UTC()
	tx, err := beginTx(ctx, r.db, run.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.payroll_runs SET
			status = :status, notes = :notes,
			total_gross = :total_gross, total_net = :total_net,
			total_income_tax = :total_income_tax, total_sgk_emp = :total_sgk_emp,
			total_sgk_empr = :total_sgk_empr, total_stamp = :total_stamp,
			employee_count = :employee_count, updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, run)
	if err != nil {
		return fmt.Errorf("update run: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *runRepo) UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.RunStatus, approverID *uuid.UUID) error {
	tx, err := beginTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	now := time.Now().UTC()
	q := `UPDATE app.payroll_runs SET status = $3, updated_at = $4`
	args := []any{tenantID, id, string(status), now}
	switch status {
	case domain.RunApproved:
		q += `, approved_by = $5, approved_at = $4`
		args = append(args, approverID)
	case domain.RunFinalised:
		q += `, finalised_at = $4`
	}
	q += ` WHERE tenant_id = $1 AND id = $2`
	res, err := tx.ExecContext(ctx, q, args...)
	if err != nil {
		return fmt.Errorf("update run status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *runRepo) UpdateTotals(ctx context.Context, tenantID, id uuid.UUID, gross, net, incomeTax, sgkEmp, sgkEmpr, stamp float64, employees int) error {
	tx, err := beginTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.ExecContext(ctx,
		`UPDATE app.payroll_runs SET
			total_gross = $3, total_net = $4, total_income_tax = $5,
			total_sgk_emp = $6, total_sgk_empr = $7, total_stamp = $8,
			employee_count = $9, updated_at = NOW()
		 WHERE tenant_id = $1 AND id = $2`,
		tenantID, id, gross, net, incomeTax, sgkEmp, sgkEmpr, stamp, employees)
	if err != nil {
		return fmt.Errorf("update totals: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *runRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Run, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var run domain.Run
	q := `SELECT ` + runCols + ` FROM app.payroll_runs WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &run, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select run: %w", err)
	}
	return &run, nil
}

func (r *runRepo) List(ctx context.Context, tenantID, periodID uuid.UUID) ([]*domain.Run, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + runCols + ` FROM app.payroll_runs
	      WHERE tenant_id = $1 AND period_id = $2
	      ORDER BY created_at DESC`
	out := []*domain.Run{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, periodID); err != nil {
		return nil, fmt.Errorf("list runs: %w", err)
	}
	return out, nil
}

// ============================================================================
// Slip Repository
// ============================================================================

// SlipRepository abstracts app.payroll_slips + slip_items.
type SlipRepository interface {
	UpsertWithItems(ctx context.Context, s *domain.Slip, items []domain.SlipItem) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Slip, error)
	ListByRun(ctx context.Context, tenantID, runID uuid.UUID) ([]*domain.Slip, error)
	ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID, year int) ([]*domain.Slip, error)
	CumulativeTaxBase(ctx context.Context, tenantID, employeeID uuid.UUID, year, month int) (float64, error)
}

// ActiveEmployeeRow describes one active employee joined with their latest
// base-salary compensation record on or before the period start.
type ActiveEmployeeRow struct {
	EmployeeID       uuid.UUID `db:"employee_id"`
	BaseSalaryGross  float64   `db:"base_salary_gross"`
	Currency         string    `db:"currency"`
}

// KamuEmployeeRow pairs an employee with 657 kadro + aile durumu fields used
// to compute a memur maaşı (kamu bordro).
type KamuEmployeeRow struct {
	EmployeeID             uuid.UUID `db:"employee_id"`
	PersonnelType          string    `db:"personnel_type"`
	HizmetSinifi           string    `db:"hizmet_sinifi"`
	KadroDerece            int       `db:"kadro_derece"`
	KadroKademe            int       `db:"kadro_kademe"`
	Gosterge               int       `db:"gosterge"`
	EkGosterge             int       `db:"ek_gosterge"`
	HizmetPuani            int       `db:"hizmet_puani"`
	KidemYili              int       `db:"kidem_yili"`
	MedeniHal              string    `db:"medeni_hal"`   // evli / bekar / dul / bosanmis
	EsCalisiyorMu          bool      `db:"es_calisiyor_mu"`
	Cocuk06                int       `db:"cocuk_06"`
	Cocuk6Plus             int       `db:"cocuk_6plus"`
	EngelliIndirimiAylik   float64   `db:"engelli_indirimi_aylik"`
}

// EmployeeCompRepository loads active employees + their current base salary.
type EmployeeCompRepository interface {
	ListActiveWithBaseSalary(ctx context.Context, tenantID uuid.UUID, periodEnd time.Time) ([]ActiveEmployeeRow, error)
	ListActiveKamu(ctx context.Context, tenantID uuid.UUID, periodEnd time.Time) ([]KamuEmployeeRow, error)
}

type employeeCompRepo struct{ db *sqlx.DB }

// NewEmployeeCompRepository constructs the repo.
func NewEmployeeCompRepository(d *sqlx.DB) EmployeeCompRepository {
	return &employeeCompRepo{db: d}
}

func (r *employeeCompRepo) ListActiveWithBaseSalary(ctx context.Context, tenantID uuid.UUID, periodEnd time.Time) ([]ActiveEmployeeRow, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	// Each employee's single most-recent active base_salary record effective
	// on or before period_end. DISTINCT ON + ORDER keeps it O(n log n).
	q := `
	SELECT DISTINCT ON (c.employee_id)
		c.employee_id,
		c.amount    AS base_salary_gross,
		c.currency
	FROM app.compensation_records c
	JOIN app.employees e ON e.id = c.employee_id AND e.deleted_at IS NULL
	WHERE c.tenant_id = $1
	  AND c.compensation_type = 'base_salary'
	  AND c.is_active = TRUE
	  AND c.effective_date <= $2
	  AND e.employment_status IN ('active', 'on_leave')
	  AND (e.termination_date IS NULL OR e.termination_date > $2)
	ORDER BY c.employee_id, c.effective_date DESC, c.created_at DESC`

	out := []ActiveEmployeeRow{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, periodEnd); err != nil {
		return nil, fmt.Errorf("list active + base salary: %w", err)
	}
	return out, nil
}

// ListActiveKamu returns 657 (+ 4B/4C) kadrolu aktif memurları kadro ve aile
// durumu bilgileriyle döner. Bu liste `bordro.CalculateKamu` beslemek için
// kullanılır; özel sektör (4857) çalışanları filtrelenir.
func (r *employeeCompRepo) ListActiveKamu(ctx context.Context, tenantID uuid.UUID, periodEnd time.Time) ([]KamuEmployeeRow, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	q := `
	SELECT
		e.id                                               AS employee_id,
		COALESCE(e.personnel_type, '657')                  AS personnel_type,
		COALESCE(e.hizmet_sinifi, 'GIH')                   AS hizmet_sinifi,
		COALESCE(e.kadro_derece, 0)                        AS kadro_derece,
		COALESCE(e.kademe, 0)                              AS kadro_kademe,
		COALESCE(e.gosterge, 0)                            AS gosterge,
		COALESCE(e.ek_gosterge, 0)                         AS ek_gosterge,
		COALESCE(e.hizmet_puani, 0)                        AS hizmet_puani,
		COALESCE(
			EXTRACT(YEAR FROM AGE($2::timestamp, e.hire_date::timestamp))::int,
			0
		)                                                  AS kidem_yili,
		COALESCE(e.medeni_hal, 'bekar')                    AS medeni_hal,
		COALESCE(e.es_calisiyor_mu, FALSE)                 AS es_calisiyor_mu,
		COALESCE(e.cocuk_06, 0)                            AS cocuk_06,
		COALESCE(e.cocuk_6plus, 0)                         AS cocuk_6plus,
		COALESCE(e.engelli_indirimi_aylik, 0)::numeric     AS engelli_indirimi_aylik
	FROM app.employees e
	WHERE e.tenant_id = $1
	  AND e.deleted_at IS NULL
	  AND e.employment_status IN ('active', 'on_leave')
	  AND (e.termination_date IS NULL OR e.termination_date > $2)
	  AND COALESCE(e.personnel_type, '4857') IN ('657', '4B', '4C', 'emekli_sozlesmeli')
	ORDER BY e.id`

	out := []KamuEmployeeRow{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, periodEnd); err != nil {
		return nil, fmt.Errorf("list kamu active: %w", err)
	}
	return out, nil
}

type slipRepo struct{ db *sqlx.DB }

// NewSlipRepository constructs the repo.
func NewSlipRepository(d *sqlx.DB) SlipRepository { return &slipRepo{db: d} }

const slipCols = `id, tenant_id, run_id, employee_id, period_year, period_month, worked_days,
	base_salary_gross, overtime_gross, bonus_gross, allowance_gross, total_gross,
	sgk_employee, sgk_unemployment_emp, income_tax_base, income_tax, cumulative_tax_base,
	stamp_tax, sgk_employer, unemployment_employer, total_net,
	metadata, created_at, updated_at`

const slipItemCols = `id, slip_id, item_type, code, description, quantity, amount,
	is_taxable, is_sgkable, order_index, created_at`

func (r *slipRepo) UpsertWithItems(ctx context.Context, s *domain.Slip, items []domain.SlipItem) error {
	s.ApplyDefaults()
	now := time.Now().UTC()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now
	tx, err := beginTx(ctx, r.db, s.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// Lookup existing row by natural key; if found, re-use its id and update.
	var existingID uuid.UUID
	err = tx.GetContext(ctx, &existingID,
		`SELECT id FROM app.payroll_slips
		 WHERE tenant_id = $1 AND run_id = $2 AND employee_id = $3`,
		s.TenantID, s.RunID, s.EmployeeID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("lookup slip: %w", err)
	}

	if existingID != uuid.Nil {
		s.ID = existingID
		if _, err := tx.NamedExecContext(ctx,
			`UPDATE app.payroll_slips SET
				period_year = :period_year, period_month = :period_month,
				worked_days = :worked_days,
				base_salary_gross = :base_salary_gross, overtime_gross = :overtime_gross,
				bonus_gross = :bonus_gross, allowance_gross = :allowance_gross,
				total_gross = :total_gross,
				sgk_employee = :sgk_employee, sgk_unemployment_emp = :sgk_unemployment_emp,
				income_tax_base = :income_tax_base, income_tax = :income_tax,
				cumulative_tax_base = :cumulative_tax_base, stamp_tax = :stamp_tax,
				sgk_employer = :sgk_employer, unemployment_employer = :unemployment_employer,
				total_net = :total_net, metadata = :metadata, updated_at = :updated_at
			 WHERE id = :id`, s); err != nil {
			return fmt.Errorf("update slip: %w", err)
		}
	} else {
		if _, err := tx.NamedExecContext(ctx,
			`INSERT INTO app.payroll_slips (
				id, tenant_id, run_id, employee_id, period_year, period_month, worked_days,
				base_salary_gross, overtime_gross, bonus_gross, allowance_gross, total_gross,
				sgk_employee, sgk_unemployment_emp, income_tax_base, income_tax, cumulative_tax_base,
				stamp_tax, sgk_employer, unemployment_employer, total_net,
				metadata, created_at, updated_at
			) VALUES (
				:id, :tenant_id, :run_id, :employee_id, :period_year, :period_month, :worked_days,
				:base_salary_gross, :overtime_gross, :bonus_gross, :allowance_gross, :total_gross,
				:sgk_employee, :sgk_unemployment_emp, :income_tax_base, :income_tax, :cumulative_tax_base,
				:stamp_tax, :sgk_employer, :unemployment_employer, :total_net,
				:metadata, :created_at, :updated_at
			)`, s); err != nil {
			return fmt.Errorf("insert slip: %w", err)
		}
	}

	// Replace items atomically.
	if _, err := tx.ExecContext(ctx, `DELETE FROM app.payroll_slip_items WHERE slip_id = $1`, s.ID); err != nil {
		return fmt.Errorf("delete items: %w", err)
	}
	for i := range items {
		items[i].SlipID = s.ID
		if items[i].CreatedAt.IsZero() {
			items[i].CreatedAt = now
		}
		items[i].ApplyDefaults()
		if _, err := tx.NamedExecContext(ctx,
			`INSERT INTO app.payroll_slip_items (
				id, slip_id, item_type, code, description, quantity, amount,
				is_taxable, is_sgkable, order_index, created_at
			) VALUES (
				:id, :slip_id, :item_type, :code, :description, :quantity, :amount,
				:is_taxable, :is_sgkable, :order_index, :created_at
			)`, items[i]); err != nil {
			return fmt.Errorf("insert slip item: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	s.Items = items
	return nil
}

func (r *slipRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Slip, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var s domain.Slip
	if err := tx.GetContext(ctx, &s,
		`SELECT `+slipCols+` FROM app.payroll_slips WHERE tenant_id = $1 AND id = $2`,
		tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select slip: %w", err)
	}
	items := []domain.SlipItem{}
	if err := tx.SelectContext(ctx, &items,
		`SELECT `+slipItemCols+` FROM app.payroll_slip_items WHERE slip_id = $1 ORDER BY order_index`,
		id); err != nil {
		return nil, fmt.Errorf("select items: %w", err)
	}
	s.Items = items
	return &s, nil
}

func (r *slipRepo) ListByRun(ctx context.Context, tenantID, runID uuid.UUID) ([]*domain.Slip, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out := []*domain.Slip{}
	if err := tx.SelectContext(ctx, &out,
		`SELECT `+slipCols+` FROM app.payroll_slips
		 WHERE tenant_id = $1 AND run_id = $2
		 ORDER BY created_at`,
		tenantID, runID); err != nil {
		return nil, fmt.Errorf("list slips: %w", err)
	}
	return out, nil
}

func (r *slipRepo) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID, year int) ([]*domain.Slip, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + slipCols + ` FROM app.payroll_slips
	      WHERE tenant_id = $1 AND employee_id = $2`
	args := []any{tenantID, employeeID}
	if year > 0 {
		q += ` AND period_year = $3`
		args = append(args, year)
	}
	q += ` ORDER BY period_year DESC, period_month DESC`
	out := []*domain.Slip{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list employee slips: %w", err)
	}
	return out, nil
}

// CumulativeTaxBase returns the sum of income_tax_base for the given employee
// across months *prior* to the supplied (year, month) pair — both values
// exclusive for the current period.
func (r *slipRepo) CumulativeTaxBase(ctx context.Context, tenantID, employeeID uuid.UUID, year, month int) (float64, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()
	var sum sql.NullFloat64
	q := `SELECT COALESCE(SUM(income_tax_base), 0) FROM app.payroll_slips
	      WHERE tenant_id = $1 AND employee_id = $2
	        AND period_year = $3 AND period_month < $4`
	if err := tx.GetContext(ctx, &sum, q, tenantID, employeeID, year, month); err != nil {
		return 0, fmt.Errorf("cumulative: %w", err)
	}
	return sum.Float64, nil
}

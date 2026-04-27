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

// ExpenseReport mirrors app.expense_reports.
type ExpenseReport struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	TenantID         uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	EmployeeID       uuid.UUID  `db:"employee_id" json:"employee_id"`
	Title            string     `db:"title" json:"title"`
	Period           *string    `db:"period" json:"period,omitempty"`
	Currency         string     `db:"currency" json:"currency"`
	TotalAmount      float64    `db:"total_amount" json:"total_amount"`
	Status           string     `db:"status" json:"status"`
	Notes            *string    `db:"notes" json:"notes,omitempty"`
	SubmittedAt      *time.Time `db:"submitted_at" json:"submitted_at,omitempty"`
	DecidedAt        *time.Time `db:"decided_at" json:"decided_at,omitempty"`
	DecidedBy        *uuid.UUID `db:"decided_by" json:"decided_by,omitempty"`
	DecisionNote     *string    `db:"decision_note" json:"decision_note,omitempty"`
	ReimbursedAt     *time.Time `db:"reimbursed_at" json:"reimbursed_at,omitempty"`
	ReimbursedRunID  *uuid.UUID `db:"reimbursed_run_id" json:"reimbursed_run_id,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
}

// ExpenseItem mirrors app.expense_items.
type ExpenseItem struct {
	ID             uuid.UUID `db:"id" json:"id"`
	TenantID       uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ReportID       uuid.UUID `db:"report_id" json:"report_id"`
	IncurredOn     time.Time `db:"incurred_on" json:"incurred_on"`
	Category       string    `db:"category" json:"category"`
	Vendor         *string   `db:"vendor" json:"vendor,omitempty"`
	Description    string    `db:"description" json:"description"`
	Amount         float64   `db:"amount" json:"amount"`
	VATRate        float64   `db:"vat_rate" json:"vat_rate"`
	VATAmount      float64   `db:"vat_amount" json:"vat_amount"`
	ReceiptBlobURL *string   `db:"receipt_blob_url" json:"receipt_blob_url,omitempty"`
	ReceiptMime    *string   `db:"receipt_mime" json:"receipt_mime,omitempty"`
	ProjectCode    *string   `db:"project_code" json:"project_code,omitempty"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

// ExpenseRepository abstracts persistence.
type ExpenseRepository interface {
	CreateReport(ctx context.Context, rep *ExpenseReport) error
	GetReport(ctx context.Context, tenantID, id uuid.UUID) (*ExpenseReport, error)
	ListReports(ctx context.Context, tenantID uuid.UUID, filter ExpenseFilter) ([]*ExpenseReport, error)
	UpdateReportStatus(ctx context.Context, tenantID, id uuid.UUID, status string, decidedBy *uuid.UUID, note string) error
	MarkReimbursed(ctx context.Context, tenantID, id, runID uuid.UUID) error

	AddItem(ctx context.Context, it *ExpenseItem) error
	DeleteItem(ctx context.Context, tenantID, id uuid.UUID) error
	ListItems(ctx context.Context, tenantID, reportID uuid.UUID) ([]*ExpenseItem, error)
}

// ExpenseFilter narrows list queries.
type ExpenseFilter struct {
	EmployeeID *uuid.UUID
	Status     string
	Period     string
	Limit      int
}

type expenseRepo struct{ db *sqlx.DB }

// NewExpenseRepository constructs.
func NewExpenseRepository(d *sqlx.DB) ExpenseRepository { return &expenseRepo{db: d} }

const expenseReportCols = `id, tenant_id, employee_id, title, period, currency,
	total_amount, status, notes, submitted_at, decided_at, decided_by,
	decision_note, reimbursed_at, reimbursed_run_id, created_at, updated_at`

func (r *expenseRepo) CreateReport(ctx context.Context, rep *ExpenseReport) error {
	if rep.ID == uuid.Nil {
		rep.ID = uuid.New()
	}
	if rep.Currency == "" {
		rep.Currency = "TRY"
	}
	if rep.Status == "" {
		rep.Status = "draft"
	}
	now := time.Now().UTC()
	rep.CreatedAt = now
	rep.UpdatedAt = now

	tx, err := beginTx(ctx, r.db, rep.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.expense_reports
		(id, tenant_id, employee_id, title, period, currency, status, notes)
		VALUES (:id, :tenant_id, :employee_id, :title, :period, :currency, :status, :notes)`
	if _, err := tx.NamedExecContext(ctx, q, rep); err != nil {
		return fmt.Errorf("insert expense_report: %w", err)
	}
	return tx.Commit()
}

func (r *expenseRepo) GetReport(ctx context.Context, tenantID, id uuid.UUID) (*ExpenseReport, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var out ExpenseReport
	q := `SELECT ` + expenseReportCols + ` FROM app.expense_reports WHERE tenant_id=$1 AND id=$2`
	if err := tx.GetContext(ctx, &out, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("expense report not found")
		}
		return nil, fmt.Errorf("get expense_report: %w", err)
	}
	return &out, nil
}

func (r *expenseRepo) ListReports(ctx context.Context, tenantID uuid.UUID, f ExpenseFilter) ([]*ExpenseReport, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	q := `SELECT ` + expenseReportCols + ` FROM app.expense_reports WHERE tenant_id=$1`
	args := []any{tenantID}
	if f.EmployeeID != nil {
		args = append(args, *f.EmployeeID)
		q += fmt.Sprintf(" AND employee_id=$%d", len(args))
	}
	if f.Status != "" {
		args = append(args, f.Status)
		q += fmt.Sprintf(" AND status=$%d", len(args))
	}
	if f.Period != "" {
		args = append(args, f.Period)
		q += fmt.Sprintf(" AND period=$%d", len(args))
	}
	q += ` ORDER BY created_at DESC`
	if f.Limit > 0 {
		args = append(args, f.Limit)
		q += fmt.Sprintf(" LIMIT $%d", len(args))
	}

	out := []*ExpenseReport{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list expense_reports: %w", err)
	}
	return out, nil
}

func (r *expenseRepo) UpdateReportStatus(ctx context.Context, tenantID, id uuid.UUID, status string, decidedBy *uuid.UUID, note string) error {
	tx, err := beginTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	now := time.Now().UTC()
	_, err = tx.ExecContext(ctx, `
		UPDATE app.expense_reports SET
			status = $3,
			decided_by = $4,
			decision_note = $5,
			decided_at = CASE WHEN $3 IN ('approved','rejected') THEN $6 ELSE decided_at END,
			submitted_at = CASE WHEN $3 = 'submitted' AND submitted_at IS NULL THEN $6 ELSE submitted_at END,
			updated_at = $6
		WHERE tenant_id=$1 AND id=$2`,
		tenantID, id, status, decidedBy, note, now)
	if err != nil {
		return fmt.Errorf("update expense status: %w", err)
	}
	return tx.Commit()
}

func (r *expenseRepo) MarkReimbursed(ctx context.Context, tenantID, id, runID uuid.UUID) error {
	tx, err := beginTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	_, err = tx.ExecContext(ctx, `
		UPDATE app.expense_reports SET
			status = 'reimbursed',
			reimbursed_at = NOW(),
			reimbursed_run_id = $3,
			updated_at = NOW()
		WHERE tenant_id=$1 AND id=$2 AND status='approved'`, tenantID, id, runID)
	if err != nil {
		return fmt.Errorf("mark reimbursed: %w", err)
	}
	return tx.Commit()
}

const expenseItemCols = `id, tenant_id, report_id, incurred_on, category, vendor,
	description, amount, vat_rate, vat_amount, receipt_blob_url, receipt_mime,
	project_code, created_at`

func (r *expenseRepo) AddItem(ctx context.Context, it *ExpenseItem) error {
	if it.ID == uuid.Nil {
		it.ID = uuid.New()
	}
	if it.VATRate == 0 {
		it.VATRate = 20.0
	}
	tx, err := beginTx(ctx, r.db, it.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO app.expense_items
		(id, tenant_id, report_id, incurred_on, category, vendor, description,
		 amount, vat_rate, receipt_blob_url, receipt_mime, project_code)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		it.ID, it.TenantID, it.ReportID, it.IncurredOn, it.Category, it.Vendor,
		it.Description, it.Amount, it.VATRate, it.ReceiptBlobURL, it.ReceiptMime, it.ProjectCode)
	if err != nil {
		return fmt.Errorf("insert expense_item: %w", err)
	}
	return tx.Commit()
}

func (r *expenseRepo) DeleteItem(ctx context.Context, tenantID, id uuid.UUID) error {
	tx, err := beginTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx,
		`DELETE FROM app.expense_items WHERE tenant_id=$1 AND id=$2`, tenantID, id); err != nil {
		return fmt.Errorf("delete item: %w", err)
	}
	return tx.Commit()
}

func (r *expenseRepo) ListItems(ctx context.Context, tenantID, reportID uuid.UUID) ([]*ExpenseItem, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out := []*ExpenseItem{}
	q := `SELECT ` + expenseItemCols + ` FROM app.expense_items
	      WHERE tenant_id=$1 AND report_id=$2 ORDER BY incurred_on DESC`
	if err := tx.SelectContext(ctx, &out, q, tenantID, reportID); err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}
	return out, nil
}

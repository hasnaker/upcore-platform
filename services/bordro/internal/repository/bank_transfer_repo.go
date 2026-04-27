package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// BankTransferRow aggregates one employee's net salary + IBAN for the batch
// transfer file builder. Missing IBAN rows are excluded — the service layer
// must surface them separately ("X çalışanın IBAN'ı eksik").
type BankTransferRow struct {
	EmployeeID uuid.UUID `db:"employee_id"`
	EmployeeNo string    `db:"employee_no"`
	Ad         string    `db:"ad"`
	Soyad      string    `db:"soyad"`
	TCKN       *string   `db:"tckn"`
	IBAN       *string   `db:"bank_iban"`
	NetSalary  float64   `db:"total_net"`
}

// BankTransferRepository abstracts slip × employee JOIN for batch payments.
type BankTransferRepository interface {
	LoadRunRows(ctx context.Context, tenantID, runID uuid.UUID) ([]BankTransferRow, error)
}

type bankTransferRepo struct{ db *sqlx.DB }

// NewBankTransferRepository constructs the repo.
func NewBankTransferRepository(d *sqlx.DB) BankTransferRepository {
	return &bankTransferRepo{db: d}
}

func (r *bankTransferRepo) LoadRunRows(ctx context.Context, tenantID, runID uuid.UUID) ([]BankTransferRow, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	q := `SELECT
		e.id          AS employee_id,
		e.employee_no AS employee_no,
		e.ad          AS ad,
		e.soyad       AS soyad,
		e.tckn        AS tckn,
		e.bank_iban   AS bank_iban,
		s.total_net   AS total_net
	FROM app.payroll_slips s
	JOIN app.employees e ON e.id = s.employee_id
	WHERE s.tenant_id = $1 AND s.run_id = $2 AND e.deleted_at IS NULL
	ORDER BY e.soyad, e.ad`

	out := []BankTransferRow{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, runID); err != nil {
		return nil, fmt.Errorf("load bank transfer rows: %w", err)
	}
	return out, nil
}

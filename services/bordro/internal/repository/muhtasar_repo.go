package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// MuhtasarSummary — GVK 98 muhtasar beyanname aggregate.
type MuhtasarSummary struct {
	Year              int     `db:"year" json:"year"`
	Month             int     `db:"month" json:"month"`
	EmployeeCount     int     `db:"employee_count" json:"employee_count"`
	TotalGross        float64 `db:"total_gross" json:"total_gross"`
	TotalSGKEmployee  float64 `db:"total_sgk_employee" json:"total_sgk_employee"`
	TotalIncomeTax    float64 `db:"total_income_tax" json:"total_income_tax"`
	TotalStampTax     float64 `db:"total_stamp_tax" json:"total_stamp_tax"`
	TotalSGKEmployer  float64 `db:"total_sgk_employer" json:"total_sgk_employer"`
	TotalUnemployment float64 `db:"total_unemployment" json:"total_unemployment"`
}

// MuhtasarRow — per-employee muhtasar satırı.
type MuhtasarRow struct {
	EmployeeID uuid.UUID `db:"employee_id" json:"employee_id"`
	Ad         string    `db:"ad" json:"ad"`
	Soyad      string    `db:"soyad" json:"soyad"`
	TCKN       *string   `db:"tckn" json:"tckn,omitempty"`
	BrutToplam float64   `db:"brut_toplam" json:"brut_toplam"`
	GelirV     float64   `db:"gelir_vergisi" json:"gelir_vergisi"`
	DamgaV     float64   `db:"damga_vergisi" json:"damga_vergisi"`
	SGKPayi    float64   `db:"sgk_payi" json:"sgk_payi"`
}

// MuhtasarRepository provides aggregates needed for the monthly muhtasar
// beyannamesi (GVK 98) and the annual özet.
type MuhtasarRepository interface {
	Monthly(ctx context.Context, tenantID uuid.UUID, year, month int) (*MuhtasarSummary, []MuhtasarRow, error)
}

type muhtasarRepo struct{ db *sqlx.DB }

// NewMuhtasarRepository constructs the repo.
func NewMuhtasarRepository(d *sqlx.DB) MuhtasarRepository {
	return &muhtasarRepo{db: d}
}

func (r *muhtasarRepo) Monthly(ctx context.Context, tenantID uuid.UUID, year, month int) (*MuhtasarSummary, []MuhtasarRow, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback() }()

	sum := &MuhtasarSummary{Year: year, Month: month}
	if err := tx.GetContext(ctx, sum,
		`SELECT
			$2::int AS year, $3::int AS month,
			COUNT(DISTINCT s.employee_id)         AS employee_count,
			COALESCE(SUM(s.total_gross), 0)       AS total_gross,
			COALESCE(SUM(s.sgk_employee), 0)      AS total_sgk_employee,
			COALESCE(SUM(s.income_tax), 0)        AS total_income_tax,
			COALESCE(SUM(s.stamp_tax), 0)         AS total_stamp_tax,
			COALESCE(SUM(s.sgk_employer), 0)      AS total_sgk_employer,
			COALESCE(SUM(s.sgk_unemployment_emp + s.unemployment_employer), 0) AS total_unemployment
		FROM app.payroll_slips s
		WHERE s.tenant_id = $1 AND s.period_year = $2 AND s.period_month = $3`,
		tenantID, year, month); err != nil {
		return nil, nil, fmt.Errorf("muhtasar summary: %w", err)
	}

	rows := []MuhtasarRow{}
	q := `SELECT
		s.employee_id,
		e.ad, e.soyad, e.tckn,
		SUM(s.total_gross)   AS brut_toplam,
		SUM(s.income_tax)    AS gelir_vergisi,
		SUM(s.stamp_tax)     AS damga_vergisi,
		SUM(s.sgk_employee + s.sgk_unemployment_emp) AS sgk_payi
	FROM app.payroll_slips s
	JOIN app.employees e ON e.id = s.employee_id
	WHERE s.tenant_id = $1 AND s.period_year = $2 AND s.period_month = $3
	GROUP BY s.employee_id, e.ad, e.soyad, e.tckn
	ORDER BY e.soyad, e.ad`
	if err := tx.SelectContext(ctx, &rows, q, tenantID, year, month); err != nil {
		return nil, nil, fmt.Errorf("muhtasar rows: %w", err)
	}
	return sum, rows, nil
}

package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// SGKSlipRow aggregates the data needed to build an APB row per employee.
// Fetched via a single JOIN across payroll_slips + employees to avoid N+1.
type SGKSlipRow struct {
	EmployeeID    uuid.UUID `db:"employee_id"`
	TCKN          *string   `db:"tckn"`
	Ad            string    `db:"ad"`
	Soyad         string    `db:"soyad"`
	MeslekKodu    *string   `db:"meslek_kodu"`
	BabaAdi       *string   `db:"baba_adi"`
	DogumTarihi   *time.Time `db:"dogum_tarihi"`
	SGKNo         *string   `db:"sgk_no"`
	SGKIseGiris   *time.Time `db:"sgk_ise_giris_tarihi"`
	PrimGun       int       `db:"prim_gun"`
	KazancTutari  float64   `db:"kazanc_tutari"`
}

// SGKRepository abstracts JOIN queries used by SGK bildirge builders.
type SGKRepository interface {
	// LoadAPBRowsForRun returns every slip in the run joined with employee
	// SGK-relevant fields. Caller is responsible for computing prim günü
	// default (30) when slip.worked_days is null.
	LoadAPBRowsForRun(ctx context.Context, tenantID, runID uuid.UUID) ([]SGKSlipRow, error)

	// LoadEmployeeSGK loads one employee's SGK-relevant fields.
	LoadEmployeeSGK(ctx context.Context, tenantID, employeeID uuid.UUID) (*SGKSlipRow, error)
}

type sgkRepo struct{ db *sqlx.DB }

// NewSGKRepository constructs the repo.
func NewSGKRepository(d *sqlx.DB) SGKRepository { return &sgkRepo{db: d} }

func (r *sgkRepo) LoadAPBRowsForRun(ctx context.Context, tenantID, runID uuid.UUID) ([]SGKSlipRow, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	q := `SELECT
		e.id                     AS employee_id,
		e.tckn                   AS tckn,
		e.ad                     AS ad,
		e.soyad                  AS soyad,
		e.meslek_kodu            AS meslek_kodu,
		e.baba_adi               AS baba_adi,
		e.dogum_tarihi           AS dogum_tarihi,
		e.sgk_no                 AS sgk_no,
		e.sgk_ise_giris_tarihi   AS sgk_ise_giris_tarihi,
		COALESCE(s.worked_days, 30)::INT AS prim_gun,
		s.total_gross            AS kazanc_tutari
	FROM app.payroll_slips s
	JOIN app.employees e ON e.id = s.employee_id
	WHERE s.tenant_id = $1 AND s.run_id = $2 AND e.deleted_at IS NULL
	ORDER BY e.soyad, e.ad`

	out := []SGKSlipRow{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, runID); err != nil {
		return nil, fmt.Errorf("load apb rows: %w", err)
	}
	return out, nil
}

func (r *sgkRepo) LoadEmployeeSGK(ctx context.Context, tenantID, employeeID uuid.UUID) (*SGKSlipRow, error) {
	tx, err := beginTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var row SGKSlipRow
	q := `SELECT
		e.id                     AS employee_id,
		e.tckn                   AS tckn,
		e.ad                     AS ad,
		e.soyad                  AS soyad,
		e.meslek_kodu            AS meslek_kodu,
		e.baba_adi               AS baba_adi,
		e.dogum_tarihi           AS dogum_tarihi,
		e.sgk_no                 AS sgk_no,
		e.sgk_ise_giris_tarihi   AS sgk_ise_giris_tarihi,
		30::INT                  AS prim_gun,
		0::NUMERIC               AS kazanc_tutari
	FROM app.employees e
	WHERE e.id = $1 AND e.deleted_at IS NULL`
	if err := tx.GetContext(ctx, &row, q, employeeID); err != nil {
		return nil, fmt.Errorf("load employee sgk: %w", err)
	}
	_ = tenantID // RLS policy enforces tenant scoping
	return &row, nil
}

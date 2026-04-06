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

// Querier is a small interface satisfied by *sqlx.DB and *sqlx.Tx.
type Querier interface {
	NamedExecContext(ctx context.Context, query string, arg any) (sql.Result, error)
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryxContext(ctx context.Context, query string, args ...any) (*sqlx.Rows, error)
}

// ListFilter parameterises List/Search queries.
type ListFilter struct {
	TenantID     uuid.UUID
	Search       string
	Status       string
	DepartmentID *uuid.UUID
	PositionID   *uuid.UUID
	ManagerID    *uuid.UUID
	Page         int
	Limit        int
	SortBy       string
	SortDir      string
}

// EmployeeRepository abstracts persistence for employees.
type EmployeeRepository interface {
	Create(ctx context.Context, tx Querier, e *domain.Employee) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Employee, error)
	GetByEmployeeNo(ctx context.Context, tenantID uuid.UUID, empNo string) (*domain.Employee, error)
	GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*domain.Employee, error)
	GetByTCKN(ctx context.Context, tenantID uuid.UUID, tckn string) (*domain.Employee, error)
	GetByUserID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.Employee, error)
	Update(ctx context.Context, e *domain.Employee) error
	SoftDelete(ctx context.Context, tenantID, id uuid.UUID) error
	List(ctx context.Context, f ListFilter) ([]*domain.Employee, int, error)
	Search(ctx context.Context, tenantID uuid.UUID, query string, limit int) ([]*domain.Employee, error)
	BulkInsert(ctx context.Context, tx Querier, emps []*domain.Employee) (int, error)
	NextEmployeeNoSeq(ctx context.Context, tenantID uuid.UUID) (int, error)
}

type employeeRepo struct {
	db *sqlx.DB
}

// NewEmployeeRepository constructs an EmployeeRepository backed by sqlx.
func NewEmployeeRepository(d *sqlx.DB) EmployeeRepository {
	return &employeeRepo{db: d}
}

// Create inserts an employee.
func (r *employeeRepo) Create(ctx context.Context, tx Querier, e *domain.Employee) error {
	if tx == nil {
		tx = r.db
	}
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	now := time.Now().UTC()
	if e.CreatedAt.IsZero() {
		e.CreatedAt = now
	}
	e.UpdatedAt = now
	e.ApplyDefaults()

	_, err := tx.NamedExecContext(ctx, db.QInsertEmployee, e)
	if err != nil {
		return mapInsertErr(err)
	}
	return nil
}

// GetByID fetches an employee by ID, scoped to tenant.
func (r *employeeRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Employee, error) {
	var e domain.Employee
	if err := r.db.GetContext(ctx, &e, db.QSelectEmployeeByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrEmployeeNotFound
		}
		return nil, fmt.Errorf("select employee: %w", err)
	}
	if e.TenantID != tenantID {
		return nil, domain.ErrEmployeeNotFound
	}
	return &e, nil
}

// GetByEmployeeNo fetches by (tenant, employee_no).
func (r *employeeRepo) GetByEmployeeNo(ctx context.Context, tenantID uuid.UUID, empNo string) (*domain.Employee, error) {
	var e domain.Employee
	if err := r.db.GetContext(ctx, &e, db.QSelectEmployeeByEmployeeNo, tenantID, empNo); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrEmployeeNotFound
		}
		return nil, fmt.Errorf("select employee by employee_no: %w", err)
	}
	return &e, nil
}

// GetByEmail fetches by (tenant, email_is).
func (r *employeeRepo) GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*domain.Employee, error) {
	var e domain.Employee
	if err := r.db.GetContext(ctx, &e, db.QSelectEmployeeByEmail, tenantID, email); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrEmployeeNotFound
		}
		return nil, fmt.Errorf("select employee by email: %w", err)
	}
	return &e, nil
}

// GetByTCKN fetches by (tenant, tckn).
func (r *employeeRepo) GetByTCKN(ctx context.Context, tenantID uuid.UUID, tckn string) (*domain.Employee, error) {
	var e domain.Employee
	if err := r.db.GetContext(ctx, &e, db.QSelectEmployeeByTCKN, tenantID, tckn); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrEmployeeNotFound
		}
		return nil, fmt.Errorf("select employee by tckn: %w", err)
	}
	return &e, nil
}

// GetByUserID fetches employee mapped to an auth user.
func (r *employeeRepo) GetByUserID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.Employee, error) {
	q := `SELECT ` + db.EmployeeCols + `
		FROM app.employees
		WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL`
	var e domain.Employee
	if err := r.db.GetContext(ctx, &e, q, tenantID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrEmployeeNotFound
		}
		return nil, fmt.Errorf("select employee by user_id: %w", err)
	}
	return &e, nil
}

// Update persists changes to an employee.
func (r *employeeRepo) Update(ctx context.Context, e *domain.Employee) error {
	e.UpdatedAt = time.Now().UTC()
	e.ApplyDefaults()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateEmployee, e)
	if err != nil {
		return mapInsertErr(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrEmployeeNotFound
	}
	return nil
}

// SoftDelete marks the row deleted.
func (r *employeeRepo) SoftDelete(ctx context.Context, tenantID, id uuid.UUID) error {
	now := time.Now().UTC()
	q := `UPDATE app.employees
		SET deleted_at = $2, updated_at = $2
		WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL`
	res, err := r.db.ExecContext(ctx, q, id, now, tenantID)
	if err != nil {
		return fmt.Errorf("soft delete employee: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrEmployeeNotFound
	}
	return nil
}

// List returns a page of employees filtered by criteria.
func (r *employeeRepo) List(ctx context.Context, f ListFilter) ([]*domain.Employee, int, error) {
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 50
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.Limit

	sortCol := normaliseSortCol(f.SortBy)
	sortDir := "DESC"
	if strings.EqualFold(f.SortDir, "asc") {
		sortDir = "ASC"
	}

	where := []string{"tenant_id = $1", "deleted_at IS NULL"}
	args := []any{f.TenantID}
	idx := 2
	if f.Status != "" {
		where = append(where, fmt.Sprintf("employment_status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.DepartmentID != nil {
		where = append(where, fmt.Sprintf("department_id = $%d", idx))
		args = append(args, *f.DepartmentID)
		idx++
	}
	if f.PositionID != nil {
		where = append(where, fmt.Sprintf("position_id = $%d", idx))
		args = append(args, *f.PositionID)
		idx++
	}
	if f.ManagerID != nil {
		where = append(where, fmt.Sprintf("manager_id = $%d", idx))
		args = append(args, *f.ManagerID)
		idx++
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		where = append(where,
			fmt.Sprintf("(ad ILIKE $%d OR soyad ILIKE $%d OR email_is ILIKE $%d OR employee_no ILIKE $%d)",
				idx, idx, idx, idx))
		args = append(args, "%"+s+"%")
		idx++
	}
	clause := strings.Join(where, " AND ")

	countQ := "SELECT COUNT(*) FROM app.employees WHERE " + clause
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count employees: %w", err)
	}

	listQ := fmt.Sprintf(
		"SELECT %s FROM app.employees WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d",
		db.EmployeeCols, clause, sortCol, sortDir, idx, idx+1,
	)
	args = append(args, f.Limit, offset)

	rows := []*domain.Employee{}
	if err := r.db.SelectContext(ctx, &rows, listQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list employees: %w", err)
	}
	return rows, total, nil
}

// Search runs a trigram / ILIKE search over name & employee_no & email.
func (r *employeeRepo) Search(ctx context.Context, tenantID uuid.UUID, query string, limit int) ([]*domain.Employee, error) {
	q := strings.TrimSpace(query)
	if q == "" {
		return []*domain.Employee{}, nil
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	sqlQuery := `
		SELECT ` + db.EmployeeCols + `,
			GREATEST(
				similarity(ad || ' ' || soyad, $2),
				similarity(employee_no, $2),
				similarity(COALESCE(email_is::text,''), $2)
			) AS rank
		FROM app.employees
		WHERE tenant_id = $1 AND deleted_at IS NULL
		  AND (
				(ad || ' ' || soyad) ILIKE '%' || $2 || '%'
			 OR employee_no ILIKE '%' || $2 || '%'
			 OR email_is::text ILIKE '%' || $2 || '%'
		  )
		ORDER BY rank DESC
		LIMIT $3`
	// We need to scan into Employee while ignoring the extra rank column.
	rows, err := r.db.QueryxContext(ctx, sqlQuery, tenantID, q, limit)
	if err != nil {
		return nil, fmt.Errorf("search employees: %w", err)
	}
	defer rows.Close()
	out := []*domain.Employee{}
	for rows.Next() {
		var e domain.Employee
		var rank float64
		cols, err := rows.Columns()
		if err != nil {
			return nil, fmt.Errorf("columns: %w", err)
		}
		// Build pointer slice matching column order.
		dest, err := scanDestFor(&e, cols, &rank)
		if err != nil {
			return nil, err
		}
		if err := rows.Scan(dest...); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		out = append(out, &e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

// BulkInsert writes a batch of employees in a single INSERT (sqlx Named).
// Returns the number of rows successfully persisted.
func (r *employeeRepo) BulkInsert(ctx context.Context, tx Querier, emps []*domain.Employee) (int, error) {
	if len(emps) == 0 {
		return 0, nil
	}
	if tx == nil {
		tx = r.db
	}
	inserted := 0
	for _, e := range emps {
		if err := r.Create(ctx, tx, e); err != nil {
			return inserted, err
		}
		inserted++
	}
	return inserted, nil
}

// NextEmployeeNoSeq returns the next numeric sequence (for auto-generation).
func (r *employeeRepo) NextEmployeeNoSeq(ctx context.Context, tenantID uuid.UUID) (int, error) {
	var n int
	if err := r.db.GetContext(ctx, &n, db.QNextEmployeeNoSeq, tenantID); err != nil {
		return 0, fmt.Errorf("next employee_no seq: %w", err)
	}
	return n, nil
}

func normaliseSortCol(col string) string {
	c := strings.ToLower(strings.TrimSpace(col))
	switch c {
	case "ad", "soyad", "employee_no", "hire_date", "created_at", "updated_at", "employment_status":
		return c
	}
	return "created_at"
}

func mapInsertErr(err error) error {
	var pqe *pq.Error
	if errors.As(err, &pqe) {
		switch pqe.Code {
		case "23505":
			c := pqe.Constraint
			m := pqe.Message
			switch {
			case strings.Contains(c, "tenant_no") || strings.Contains(m, "employee_no"):
				return domain.ErrDuplicateEmployeeNo
			case strings.Contains(c, "tenant_external") || strings.Contains(m, "external_id"):
				return domain.ErrDuplicateExternalID
			case strings.Contains(m, "tckn"):
				return domain.ErrDuplicateTCKN
			}
			return domain.ErrConflict
		case "23514":
			if strings.Contains(pqe.Message, "tckn") {
				return domain.ErrInvalidTCKN
			}
			return fmt.Errorf("check constraint: %s", pqe.Message)
		}
	}
	return fmt.Errorf("db error: %w", err)
}

// scanDestFor builds a []any destination matching the returned column order,
// placing the `rank` column into the supplied float64 sink.
func scanDestFor(e *domain.Employee, cols []string, rank *float64) ([]any, error) {
	m := map[string]any{
		"id":                 &e.ID,
		"tenant_id":          &e.TenantID,
		"user_id":            &e.UserID,
		"external_id":        &e.ExternalID,
		"employee_no":        &e.EmployeeNo,
		"tckn":               &e.TCKN,
		"ad":                 &e.Ad,
		"soyad":              &e.Soyad,
		"dogum_tarihi":       &e.DogumTarihi,
		"dogum_yeri":         &e.DogumYeri,
		"cinsiyet":           &e.Cinsiyet,
		"medeni_hali":        &e.MedeniHali,
		"uyruk":              &e.Uyruk,
		"email_is":           &e.EmailIs,
		"email_kisisel":      &e.EmailKisisel,
		"telefon_is":         &e.TelefonIs,
		"telefon_kisisel":    &e.TelefonKisisel,
		"adres":              &e.Adres,
		"sehir":              &e.Sehir,
		"ulke":               &e.Ulke,
		"posta_kodu":         &e.PostaKodu,
		"department_id":      &e.DepartmentID,
		"position_id":        &e.PositionID,
		"manager_id":         &e.ManagerID,
		"hire_date":          &e.HireDate,
		"tenure_months":      &e.TenureMonths,
		"probation_end_date": &e.ProbationEndDate,
		"termination_date":   &e.TerminationDate,
		"termination_reason": &e.TerminationReason,
		"employment_status":  &e.EmploymentStatus,
		"employment_type":    &e.EmploymentType,
		"work_location":      &e.WorkLocation,
		"contract_type":      &e.ContractType,
		"salary_gross":       &e.SalaryGross,
		"salary_net":         &e.SalaryNet,
		"salary_currency":    &e.SalaryCurrency,
		"bank_iban":          &e.BankIBAN,
		"sgk_no":             &e.SGKNo,
		"notes":              &e.Notes,
		"metadata":           &e.Metadata,
		"created_at":         &e.CreatedAt,
		"updated_at":         &e.UpdatedAt,
		"deleted_at":         &e.DeletedAt,
		"rank":               rank,
	}
	out := make([]any, len(cols))
	for i, c := range cols {
		p, ok := m[c]
		if !ok {
			return nil, fmt.Errorf("unexpected column %q in scan", c)
		}
		out[i] = p
	}
	return out, nil
}

package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/upcore/organization/internal/domain"
)

// Querier is a small interface implemented by *sqlx.DB and *sqlx.Tx.
type Querier interface {
	NamedExecContext(ctx context.Context, query string, arg any) (sql.Result, error)
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// DepartmentRepository abstracts department persistence.
type DepartmentRepository interface {
	Create(ctx context.Context, tx Querier, d *domain.Department) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Department, error)
	GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Department, error)
	List(ctx context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Department, error)
	ListByParent(ctx context.Context, tenantID uuid.UUID, parentID *uuid.UUID) ([]*domain.Department, error)
	GetSubtree(ctx context.Context, tx Querier, tenantID uuid.UUID, rootPath string) ([]*domain.Department, error)
	GetAncestors(ctx context.Context, tenantID, id uuid.UUID) ([]*domain.Department, error)
	Update(ctx context.Context, tx Querier, d *domain.Department) error
	UpdatePath(ctx context.Context, tx Querier, id uuid.UUID, path string, depth int) error
	MovePaths(ctx context.Context, tx Querier, tenantID uuid.UUID, oldRoot, newRoot string) error
	Archive(ctx context.Context, id uuid.UUID) error
	CountActiveChildren(ctx context.Context, tenantID, parentID uuid.UUID) (int, error)
	SetParent(ctx context.Context, id uuid.UUID, parentID *uuid.UUID) error
}

type departmentRepo struct {
	db *sqlx.DB
}

// NewDepartmentRepository creates a new DepartmentRepository.
func NewDepartmentRepository(d *sqlx.DB) DepartmentRepository {
	return &departmentRepo{db: d}
}

const qInsertDepartment = `
	INSERT INTO app.departments
	  (id, tenant_id, parent_id, code, name_tr, name_en, description, path, depth,
	   head_user_id, cost_center, location, headcount_cap, active, created_at, updated_at)
	VALUES
	  (:id, :tenant_id, :parent_id, :code, :name_tr, :name_en, :description, :path, :depth,
	   :head_user_id, :cost_center, :location, :headcount_cap, :active, :created_at, :updated_at)`

const qSelectDepartmentCols = `
	SELECT id, tenant_id, parent_id, code, name_tr, name_en, description,
	  path::text AS path, depth, head_user_id, cost_center, location, headcount_cap,
	  active, created_at, updated_at, deleted_at
	FROM app.departments`

// Create inserts a department.
func (r *departmentRepo) Create(ctx context.Context, tx Querier, d *domain.Department) error {
	q := r.qr(tx)
	if _, err := q.NamedExecContext(ctx, qInsertDepartment, d); err != nil {
		if isUniqueViolation(err, "uq_departments_tenant_code", "code") {
			return domain.ErrDuplicateCode
		}
		return fmt.Errorf("insert department: %w", err)
	}
	return nil
}

// GetByID fetches a department scoped to the tenant.
func (r *departmentRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Department, error) {
	q := qSelectDepartmentCols + ` WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`
	var d domain.Department
	if err := r.db.GetContext(ctx, &d, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrDepartmentNotFound
		}
		return nil, fmt.Errorf("get department: %w", err)
	}
	return &d, nil
}

// GetByCode fetches a department by tenant + code.
func (r *departmentRepo) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Department, error) {
	q := qSelectDepartmentCols + ` WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL`
	var d domain.Department
	if err := r.db.GetContext(ctx, &d, q, tenantID, code); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrDepartmentNotFound
		}
		return nil, fmt.Errorf("get department by code: %w", err)
	}
	return &d, nil
}

// List returns all departments for a tenant, ordered by path.
func (r *departmentRepo) List(ctx context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Department, error) {
	q := qSelectDepartmentCols + ` WHERE tenant_id = $1 AND deleted_at IS NULL`
	if !includeArchived {
		q += ` AND active = true`
	}
	q += ` ORDER BY path`
	var out []*domain.Department
	if err := r.db.SelectContext(ctx, &out, q, tenantID); err != nil {
		return nil, fmt.Errorf("list departments: %w", err)
	}
	return out, nil
}

// ListByParent returns direct children of a parent (nil for roots).
func (r *departmentRepo) ListByParent(ctx context.Context, tenantID uuid.UUID, parentID *uuid.UUID) ([]*domain.Department, error) {
	var q string
	var args []any
	if parentID == nil {
		q = qSelectDepartmentCols + ` WHERE tenant_id = $1 AND parent_id IS NULL AND deleted_at IS NULL ORDER BY path`
		args = []any{tenantID}
	} else {
		q = qSelectDepartmentCols + ` WHERE tenant_id = $1 AND parent_id = $2 AND deleted_at IS NULL ORDER BY path`
		args = []any{tenantID, *parentID}
	}
	var out []*domain.Department
	if err := r.db.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list children: %w", err)
	}
	return out, nil
}

// GetSubtree returns all descendants (and the root itself) using ltree <@ operator.
func (r *departmentRepo) GetSubtree(ctx context.Context, tx Querier, tenantID uuid.UUID, rootPath string) ([]*domain.Department, error) {
	q := qSelectDepartmentCols + ` WHERE tenant_id = $1 AND path <@ $2::ltree AND deleted_at IS NULL ORDER BY path`
	var out []*domain.Department
	if err := r.qr(tx).SelectContext(ctx, &out, q, tenantID, rootPath); err != nil {
		return nil, fmt.Errorf("get subtree: %w", err)
	}
	return out, nil
}

// GetAncestors returns every ancestor of the given department (root-first).
func (r *departmentRepo) GetAncestors(ctx context.Context, tenantID, id uuid.UUID) ([]*domain.Department, error) {
	// Use path @> (select path) to find ancestors, excluding the node itself.
	q := qSelectDepartmentCols + `
		WHERE tenant_id = $1
		  AND deleted_at IS NULL
		  AND path @> (SELECT path FROM app.departments WHERE id = $2 AND tenant_id = $1)
		  AND id <> $2
		ORDER BY nlevel(path)`
	var out []*domain.Department
	if err := r.db.SelectContext(ctx, &out, q, tenantID, id); err != nil {
		return nil, fmt.Errorf("get ancestors: %w", err)
	}
	return out, nil
}

// Update persists editable department fields.
func (r *departmentRepo) Update(ctx context.Context, tx Querier, d *domain.Department) error {
	q := `
		UPDATE app.departments SET
		  name_tr = :name_tr,
		  name_en = :name_en,
		  description = :description,
		  head_user_id = :head_user_id,
		  cost_center = :cost_center,
		  location = :location,
		  headcount_cap = :headcount_cap,
		  active = :active,
		  updated_at = now()
		WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL`
	res, err := r.qr(tx).NamedExecContext(ctx, q, d)
	if err != nil {
		return fmt.Errorf("update department: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrDepartmentNotFound
	}
	return nil
}

// UpdatePath updates a single department's path and depth (used during move).
func (r *departmentRepo) UpdatePath(ctx context.Context, tx Querier, id uuid.UUID, path string, depth int) error {
	q := `UPDATE app.departments SET path = $2::ltree, depth = $3, updated_at = now() WHERE id = $1`
	if _, err := r.qr(tx).ExecContext(ctx, q, id, path, depth); err != nil {
		return fmt.Errorf("update path: %w", err)
	}
	return nil
}

// MovePaths rewrites all paths under oldRoot to newRoot in a single statement.
// newRoot must be the full target path for the relocated subtree root.
// For each row we strip the oldRoot prefix (nlevel(oldRoot) labels) and
// concatenate the remainder onto newRoot.
func (r *departmentRepo) MovePaths(ctx context.Context, tx Querier, tenantID uuid.UUID, oldRoot, newRoot string) error {
	q := `
		UPDATE app.departments
		SET path = ($3::ltree || subpath(path, nlevel($2::ltree)))::ltree,
		    depth = nlevel(($3::ltree || subpath(path, nlevel($2::ltree)))::ltree) - 1,
		    updated_at = now()
		WHERE tenant_id = $1 AND path <@ $2::ltree`
	if _, err := r.qr(tx).ExecContext(ctx, q, tenantID, oldRoot, newRoot); err != nil {
		return fmt.Errorf("move paths: %w", err)
	}
	return nil
}

// Archive marks a department archived (soft delete + active=false).
func (r *departmentRepo) Archive(ctx context.Context, id uuid.UUID) error {
	q := `UPDATE app.departments SET active = false, deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL`
	res, err := r.db.ExecContext(ctx, q, id)
	if err != nil {
		return fmt.Errorf("archive department: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrDepartmentNotFound
	}
	return nil
}

// SetParent updates just the parent_id column (used after MovePaths).
func (r *departmentRepo) SetParent(ctx context.Context, id uuid.UUID, parentID *uuid.UUID) error {
	q := `UPDATE app.departments SET parent_id = $2, updated_at = now() WHERE id = $1`
	if _, err := r.db.ExecContext(ctx, q, id, parentID); err != nil {
		return fmt.Errorf("set parent: %w", err)
	}
	return nil
}

// CountActiveChildren returns the number of active children under parentID.
func (r *departmentRepo) CountActiveChildren(ctx context.Context, tenantID, parentID uuid.UUID) (int, error) {
	q := `SELECT count(*) FROM app.departments WHERE tenant_id = $1 AND parent_id = $2 AND deleted_at IS NULL AND active = true`
	var n int
	if err := r.db.GetContext(ctx, &n, q, tenantID, parentID); err != nil {
		return 0, fmt.Errorf("count children: %w", err)
	}
	return n, nil
}

func (r *departmentRepo) qr(tx Querier) Querier {
	if tx != nil {
		return tx
	}
	return r.db
}

// isUniqueViolation returns true for pq unique_violation on any matching constraint.
func isUniqueViolation(err error, hints ...string) bool {
	var pqe *pq.Error
	if !errors.As(err, &pqe) {
		return false
	}
	if pqe.Code != "23505" {
		return false
	}
	if len(hints) == 0 {
		return true
	}
	for _, h := range hints {
		if strings.Contains(pqe.Constraint, h) || strings.Contains(pqe.Message, h) {
			return true
		}
	}
	return false
}

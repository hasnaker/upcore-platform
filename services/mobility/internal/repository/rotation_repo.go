// Package repository implements sqlx-backed persistence for mobility entities.
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/mobility/internal/domain"
)

// RotationRepo persists internal_rotations.
type RotationRepo struct {
	db *sqlx.DB
}

// NewRotationRepo returns a repo bound to the given connection.
func NewRotationRepo(db *sqlx.DB) *RotationRepo { return &RotationRepo{db: db} }

// Create inserts a new proposed rotation.
func (r *RotationRepo) Create(ctx context.Context, rot *domain.InternalRotation) (*domain.InternalRotation, error) {
	const q = `
		INSERT INTO app.internal_rotations (
			tenant_id, employee_id, from_position_id, to_position_id,
			from_department_id, to_department_id, status, reason_tr,
			start_date, end_date, requested_by_id
		) VALUES (
			:tenant_id, :employee_id, :from_position_id, :to_position_id,
			:from_department_id, :to_department_id, :status, :reason_tr,
			:start_date, :end_date, :requested_by_id
		)
		RETURNING id, created_at, updated_at;
	`
	rows, err := r.db.NamedQueryContext(ctx, q, rot)
	if err != nil {
		return nil, fmt.Errorf("rotation insert: %w", err)
	}
	defer rows.Close()
	if rows.Next() {
		if err := rows.StructScan(rot); err != nil {
			return nil, fmt.Errorf("rotation scan: %w", err)
		}
	}
	return rot, nil
}

// Get fetches a rotation by id + tenant.
func (r *RotationRepo) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.InternalRotation, error) {
	var rot domain.InternalRotation
	const q = `SELECT * FROM app.internal_rotations WHERE tenant_id=$1 AND id=$2;`
	if err := r.db.GetContext(ctx, &rot, q, tenantID, id); err != nil {
		return nil, mapSQLErr(err)
	}
	return &rot, nil
}

// ListByEmployee returns rotations for one employee, newest first.
func (r *RotationRepo) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]domain.InternalRotation, error) {
	const q = `
		SELECT * FROM app.internal_rotations
		 WHERE tenant_id=$1 AND employee_id=$2
		 ORDER BY created_at DESC;
	`
	var out []domain.InternalRotation
	if err := r.db.SelectContext(ctx, &out, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("rotation list employee: %w", err)
	}
	return out, nil
}

// UpdateStatus transitions a rotation and stamps approver info when approved.
func (r *RotationRepo) UpdateStatus(
	ctx context.Context,
	tenantID, id uuid.UUID,
	next domain.RotationStatus,
	approverID *uuid.UUID,
) error {
	const q = `
		UPDATE app.internal_rotations
		   SET status       = $3,
		       approved_by_id = CASE WHEN $3 = 'approved' THEN $4 ELSE approved_by_id END,
		       approved_at    = CASE WHEN $3 = 'approved' THEN NOW() ELSE approved_at END,
		       updated_at     = NOW()
		 WHERE tenant_id=$1 AND id=$2;
	`
	res, err := r.db.ExecContext(ctx, q, tenantID, id, next, approverID)
	if err != nil {
		return fmt.Errorf("rotation update status: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// HasOpenRotation reports whether the employee already has a rotation in
// proposed or approved state — used to prevent duplicate concurrent requests.
func (r *RotationRepo) HasOpenRotation(ctx context.Context, tenantID, employeeID uuid.UUID) (bool, error) {
	const q = `
		SELECT EXISTS (
			SELECT 1 FROM app.internal_rotations
			 WHERE tenant_id=$1 AND employee_id=$2
			   AND status IN ('proposed','approved','active')
		);
	`
	var exists bool
	if err := r.db.GetContext(ctx, &exists, q, tenantID, employeeID); err != nil {
		return false, fmt.Errorf("rotation has open: %w", err)
	}
	return exists, nil
}

// ListPending returns rotations in a given status for the tenant, newest first.
// Used by the approval console.
func (r *RotationRepo) ListPending(ctx context.Context, tenantID uuid.UUID, status domain.RotationStatus) ([]domain.InternalRotation, error) {
	const q = `
		SELECT * FROM app.internal_rotations
		 WHERE tenant_id=$1 AND status=$2
		 ORDER BY created_at ASC;
	`
	var out []domain.InternalRotation
	if err := r.db.SelectContext(ctx, &out, q, tenantID, status); err != nil {
		return nil, fmt.Errorf("rotation list pending: %w", err)
	}
	return out, nil
}

// RotationListFilter — keyset filter for GET /rotations.
type RotationListFilter struct {
	TenantID        uuid.UUID
	Status          string
	EmployeeID      *uuid.UUID
	CursorCreatedAt *time.Time
	CursorID        *uuid.UUID
	Limit           int
}

// List returns a keyset-paginated page of rotations scoped to the tenant.
// Ordering: (created_at DESC, id DESC).
func (r *RotationRepo) List(ctx context.Context, f RotationListFilter) ([]domain.InternalRotation, error) {
	limit := f.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	conds := "tenant_id=$1"
	args := []any{f.TenantID}
	idx := 2
	if f.Status != "" {
		conds += fmt.Sprintf(" AND status=$%d", idx)
		args = append(args, f.Status)
		idx++
	}
	if f.EmployeeID != nil {
		conds += fmt.Sprintf(" AND employee_id=$%d", idx)
		args = append(args, *f.EmployeeID)
		idx++
	}
	if f.CursorCreatedAt != nil && f.CursorID != nil {
		conds += fmt.Sprintf(" AND (created_at, id) < ($%d, $%d)", idx, idx+1)
		args = append(args, *f.CursorCreatedAt, *f.CursorID)
		idx += 2
	}
	q := fmt.Sprintf(
		"SELECT * FROM app.internal_rotations WHERE %s ORDER BY created_at DESC, id DESC LIMIT $%d",
		conds, idx,
	)
	args = append(args, limit)
	var out []domain.InternalRotation
	if err := r.db.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("rotation list: %w", err)
	}
	return out, nil
}

// LastRotationCompletedAt returns the employee's last completed rotation date,
// used to enforce RotationCooldownDays.
func (r *RotationRepo) LastRotationCompletedAt(ctx context.Context, tenantID, employeeID uuid.UUID) (*string, error) {
	const q = `
		SELECT end_date::text FROM app.internal_rotations
		 WHERE tenant_id=$1 AND employee_id=$2 AND status='completed'
		 ORDER BY end_date DESC NULLS LAST LIMIT 1;
	`
	var s *string
	err := r.db.GetContext(ctx, &s, q, tenantID, employeeID)
	if errors.Is(err, sqlNoRows()) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("rotation last completed: %w", err)
	}
	return s, nil
}

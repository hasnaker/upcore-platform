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

	"github.com/upcore/intervention/internal/domain"
)

// AssignmentRepository abstracts persistence for intervention assignments.
type AssignmentRepository interface {
	Create(ctx context.Context, a *domain.Assignment) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Assignment, error)
	Update(ctx context.Context, a *domain.Assignment) error
	ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Assignment, error)
	ListByIntervention(ctx context.Context, tenantID, interventionID uuid.UUID) ([]*domain.Assignment, error)
	ListByStatus(ctx context.Context, tenantID uuid.UUID, status domain.AssignmentStatus, limit, offset int) ([]*domain.Assignment, int, error)
	List(ctx context.Context, f domain.AssignmentFilter) ([]*domain.Assignment, int, error)
	ListPendingConsent(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Assignment, error)
	BulkCreate(ctx context.Context, assignments []*domain.Assignment) (int, error)
	Cancel(ctx context.Context, tenantID, id uuid.UUID, reason string) error
}

type assignmentRepo struct {
	db *sqlx.DB
}

// NewAssignmentRepository constructs an AssignmentRepository backed by sqlx.
func NewAssignmentRepository(db *sqlx.DB) AssignmentRepository {
	return &assignmentRepo{db: db}
}

func (r *assignmentRepo) Create(ctx context.Context, a *domain.Assignment) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	now := time.Now().UTC()
	a.AssignedAt = now
	a.CreatedAt = now
	a.UpdatedAt = now
	if a.Status == "" {
		a.Status = domain.AssignmentStatusAssigned
	}

	q := `INSERT INTO app.intervention_assignments (
		id, tenant_id, intervention_id, employee_id, assigned_by,
		assigned_at, starts_at, ends_at, status, accepted_at,
		completed_at, cancelled_at, rank, recommendation_score,
		rationale_tr, notes, metadata, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :intervention_id, :employee_id, :assigned_by,
		:assigned_at, :starts_at, :ends_at, :status, :accepted_at,
		:completed_at, :cancelled_at, :rank, :recommendation_score,
		:rationale_tr, :notes, :metadata, :created_at, :updated_at
	)`
	_, err := r.db.NamedExecContext(ctx, q, a)
	if err != nil {
		if strings.Contains(err.Error(), "23505") {
			return domain.ErrConflict
		}
		return fmt.Errorf("insert assignment: %w", err)
	}
	return nil
}

func (r *assignmentRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Assignment, error) {
	var a domain.Assignment
	q := `SELECT * FROM app.intervention_assignments WHERE id = $1 AND tenant_id = $2`
	if err := r.db.GetContext(ctx, &a, q, id, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrAssignmentNotFound
		}
		return nil, fmt.Errorf("select assignment: %w", err)
	}
	return &a, nil
}

func (r *assignmentRepo) Update(ctx context.Context, a *domain.Assignment) error {
	a.UpdatedAt = time.Now().UTC()
	q := `UPDATE app.intervention_assignments SET
		status = :status, accepted_at = :accepted_at, completed_at = :completed_at,
		cancelled_at = :cancelled_at, starts_at = :starts_at, ends_at = :ends_at,
		notes = :notes, updated_at = :updated_at
	WHERE id = :id AND tenant_id = :tenant_id`
	res, err := r.db.NamedExecContext(ctx, q, a)
	if err != nil {
		return fmt.Errorf("update assignment: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrAssignmentNotFound
	}
	return nil
}

func (r *assignmentRepo) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Assignment, error) {
	var rows []*domain.Assignment
	q := `SELECT * FROM app.intervention_assignments
		WHERE tenant_id = $1 AND employee_id = $2
		ORDER BY assigned_at DESC`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list by employee: %w", err)
	}
	return rows, nil
}

func (r *assignmentRepo) ListByIntervention(ctx context.Context, tenantID, interventionID uuid.UUID) ([]*domain.Assignment, error) {
	var rows []*domain.Assignment
	q := `SELECT * FROM app.intervention_assignments
		WHERE tenant_id = $1 AND intervention_id = $2
		ORDER BY assigned_at DESC`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, interventionID); err != nil {
		return nil, fmt.Errorf("list by intervention: %w", err)
	}
	return rows, nil
}

func (r *assignmentRepo) ListByStatus(ctx context.Context, tenantID uuid.UUID, status domain.AssignmentStatus, limit, offset int) ([]*domain.Assignment, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var total int
	cq := `SELECT COUNT(*) FROM app.intervention_assignments WHERE tenant_id = $1 AND status = $2`
	if err := r.db.GetContext(ctx, &total, cq, tenantID, string(status)); err != nil {
		return nil, 0, fmt.Errorf("count by status: %w", err)
	}

	var rows []*domain.Assignment
	q := `SELECT * FROM app.intervention_assignments
		WHERE tenant_id = $1 AND status = $2
		ORDER BY assigned_at DESC LIMIT $3 OFFSET $4`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, string(status), limit, offset); err != nil {
		return nil, 0, fmt.Errorf("list by status: %w", err)
	}
	return rows, total, nil
}

func (r *assignmentRepo) List(ctx context.Context, f domain.AssignmentFilter) ([]*domain.Assignment, int, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}
	where := []string{"1=1"}
	args := []any{}
	idx := 1

	if f.EmployeeID != nil {
		where = append(where, fmt.Sprintf("employee_id = $%d", idx))
		args = append(args, *f.EmployeeID)
		idx++
	}
	if f.InterventionID != nil {
		where = append(where, fmt.Sprintf("intervention_id = $%d", idx))
		args = append(args, *f.InterventionID)
		idx++
	}
	if f.Status != nil {
		where = append(where, fmt.Sprintf("status = $%d", idx))
		args = append(args, string(*f.Status))
		idx++
	}
	if f.AssignedFrom != nil {
		where = append(where, fmt.Sprintf("assigned_at >= $%d", idx))
		args = append(args, *f.AssignedFrom)
		idx++
	}
	if f.AssignedTo != nil {
		where = append(where, fmt.Sprintf("assigned_at <= $%d", idx))
		args = append(args, *f.AssignedTo)
		idx++
	}

	clause := strings.Join(where, " AND ")

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.intervention_assignments WHERE "+clause, args...); err != nil {
		return nil, 0, fmt.Errorf("count assignments: %w", err)
	}

	q := fmt.Sprintf("SELECT * FROM app.intervention_assignments WHERE %s ORDER BY assigned_at DESC LIMIT $%d OFFSET $%d",
		clause, idx, idx+1)
	args = append(args, f.Limit, f.Offset)

	var rows []*domain.Assignment
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list assignments: %w", err)
	}
	return rows, total, nil
}

func (r *assignmentRepo) ListPendingConsent(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Assignment, error) {
	var rows []*domain.Assignment
	q := `SELECT * FROM app.intervention_assignments
		WHERE tenant_id = $1 AND employee_id = $2 AND status = 'assigned' AND accepted_at IS NULL
		ORDER BY assigned_at DESC`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list pending consent: %w", err)
	}
	return rows, nil
}

func (r *assignmentRepo) BulkCreate(ctx context.Context, assignments []*domain.Assignment) (int, error) {
	created := 0
	for _, a := range assignments {
		if err := r.Create(ctx, a); err != nil {
			return created, err
		}
		created++
	}
	return created, nil
}

func (r *assignmentRepo) Cancel(ctx context.Context, tenantID, id uuid.UUID, reason string) error {
	now := time.Now().UTC()
	q := `UPDATE app.intervention_assignments
		SET status = 'cancelled', cancelled_at = $3, notes = COALESCE(notes || '; ', '') || $4, updated_at = $5
		WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('completed', 'cancelled', 'lapsed', 'declined')`
	res, err := r.db.ExecContext(ctx, q, id, tenantID, now, reason, now)
	if err != nil {
		return fmt.Errorf("cancel assignment: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrAssignmentNotFound
	}
	return nil
}

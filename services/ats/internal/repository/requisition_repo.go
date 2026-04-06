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

	"github.com/upcore/ats/internal/db"
	"github.com/upcore/ats/internal/domain"
)

// Querier is a small interface satisfied by *sqlx.DB and *sqlx.Tx.
type Querier interface {
	NamedExecContext(ctx context.Context, query string, arg any) (sql.Result, error)
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryxContext(ctx context.Context, query string, args ...any) (*sqlx.Rows, error)
}

// RequisitionFilter parameterises list queries.
type RequisitionFilter struct {
	TenantID        uuid.UUID
	Status          string
	HiringManagerID *uuid.UUID
	RecruiterID     *uuid.UUID
	Search          string
	Page            int
	Limit           int
}

// RequisitionRepository abstracts persistence for requisitions.
type RequisitionRepository interface {
	Create(ctx context.Context, r *domain.Requisition) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Requisition, error)
	Update(ctx context.Context, r *domain.Requisition) error
	List(ctx context.Context, f RequisitionFilter) ([]*domain.Requisition, int, error)
	CountByStatus(ctx context.Context, tenantID uuid.UUID) (map[domain.ReqStatus]int, error)
}

type requisitionRepo struct {
	db *sqlx.DB
}

// NewRequisitionRepository constructs a RequisitionRepository backed by sqlx.
func NewRequisitionRepository(d *sqlx.DB) RequisitionRepository {
	return &requisitionRepo{db: d}
}

// Create inserts a requisition.
func (r *requisitionRepo) Create(ctx context.Context, req *domain.Requisition) error {
	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}
	now := time.Now().UTC()
	if req.CreatedAt.IsZero() {
		req.CreatedAt = now
	}
	req.UpdatedAt = now
	req.ApplyDefaults()

	_, err := r.db.NamedExecContext(ctx, db.QInsertRequisition, req)
	if err != nil {
		return mapPqError(err)
	}
	return nil
}

// GetByID fetches a requisition by ID, scoped to tenant.
func (r *requisitionRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Requisition, error) {
	var req domain.Requisition
	if err := r.db.GetContext(ctx, &req, db.QSelectRequisitionByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrRequisitionNotFound
		}
		return nil, fmt.Errorf("select requisition: %w", err)
	}
	if req.TenantID != tenantID {
		return nil, domain.ErrRequisitionNotFound
	}
	return &req, nil
}

// Update persists changes to a requisition.
func (r *requisitionRepo) Update(ctx context.Context, req *domain.Requisition) error {
	req.UpdatedAt = time.Now().UTC()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateRequisition, req)
	if err != nil {
		return mapPqError(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrRequisitionNotFound
	}
	return nil
}

// List returns a page of requisitions filtered by criteria.
func (r *requisitionRepo) List(ctx context.Context, f RequisitionFilter) ([]*domain.Requisition, int, error) {
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 50
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.Limit

	where := []string{"tenant_id = $1"}
	args := []any{f.TenantID}
	idx := 2

	if f.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.HiringManagerID != nil {
		where = append(where, fmt.Sprintf("hiring_manager_id = $%d", idx))
		args = append(args, *f.HiringManagerID)
		idx++
	}
	if f.RecruiterID != nil {
		where = append(where, fmt.Sprintf("recruiter_id = $%d", idx))
		args = append(args, *f.RecruiterID)
		idx++
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		where = append(where, fmt.Sprintf("(title ILIKE $%d OR description ILIKE $%d)", idx, idx))
		args = append(args, "%"+s+"%")
		idx++
	}
	clause := strings.Join(where, " AND ")

	countQ := "SELECT COUNT(*) FROM app.requisitions WHERE " + clause
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count requisitions: %w", err)
	}

	listQ := fmt.Sprintf(
		"SELECT %s FROM app.requisitions WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		db.RequisitionCols, clause, idx, idx+1,
	)
	args = append(args, f.Limit, offset)

	rows := []*domain.Requisition{}
	if err := r.db.SelectContext(ctx, &rows, listQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list requisitions: %w", err)
	}
	return rows, total, nil
}

// CountByStatus returns requisition counts grouped by status.
func (r *requisitionRepo) CountByStatus(ctx context.Context, tenantID uuid.UUID) (map[domain.ReqStatus]int, error) {
	type row struct {
		Status string `db:"status"`
		Count  int    `db:"count"`
	}
	q := `SELECT status, COUNT(*) as count FROM app.requisitions WHERE tenant_id = $1 GROUP BY status`
	var rows []row
	if err := r.db.SelectContext(ctx, &rows, q, tenantID); err != nil {
		return nil, fmt.Errorf("count by status: %w", err)
	}
	out := make(map[domain.ReqStatus]int, len(rows))
	for _, rr := range rows {
		out[domain.ReqStatus(rr.Status)] = rr.Count
	}
	return out, nil
}

func mapPqError(err error) error {
	var pqe *pq.Error
	if errors.As(err, &pqe) {
		switch pqe.Code {
		case "23505":
			return domain.ErrConflict
		case "23514":
			return domain.ErrValidation
		}
	}
	return fmt.Errorf("db error: %w", err)
}

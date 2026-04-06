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

	"github.com/upcore/assessment/internal/db"
	"github.com/upcore/assessment/internal/domain"
)

// Querier is a small interface satisfied by *sqlx.DB and *sqlx.Tx.
type Querier interface {
	NamedExecContext(ctx context.Context, query string, arg any) (sql.Result, error)
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// ListFilter parameterises List queries.
type ListFilter struct {
	TenantID       uuid.UUID
	EmployeeID     *uuid.UUID
	InstrumentCode string
	Status         string
	Page           int
	Limit          int
	SortBy         string
	SortDir        string
}

// AssessmentRepository abstracts persistence for assessments.
type AssessmentRepository interface {
	Create(ctx context.Context, a *domain.Assessment) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Assessment, error)
	GetByToken(ctx context.Context, token string) (*domain.Assessment, error)
	Update(ctx context.Context, a *domain.Assessment) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, f ListFilter) ([]*domain.Assessment, int, error)
}

type assessmentRepo struct {
	db *sqlx.DB
}

// NewAssessmentRepository constructs an AssessmentRepository backed by sqlx.
func NewAssessmentRepository(d *sqlx.DB) AssessmentRepository {
	return &assessmentRepo{db: d}
}

// Create inserts an assessment.
func (r *assessmentRepo) Create(ctx context.Context, a *domain.Assessment) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	now := time.Now().UTC()
	if a.CreatedAt.IsZero() {
		a.CreatedAt = now
	}
	a.UpdatedAt = now
	if len(a.Metadata) == 0 {
		a.Metadata = domain.JSONB("{}")
	}

	_, err := r.db.NamedExecContext(ctx, db.QInsertAssessment, a)
	if err != nil {
		return mapPQError(err)
	}
	return nil
}

// GetByID fetches an assessment by ID.
func (r *assessmentRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Assessment, error) {
	var a domain.Assessment
	if err := r.db.GetContext(ctx, &a, db.QSelectAssessmentByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrAssessmentNotFound
		}
		return nil, fmt.Errorf("select assessment: %w", err)
	}
	return &a, nil
}

// GetByToken fetches an assessment by candidate token.
func (r *assessmentRepo) GetByToken(ctx context.Context, token string) (*domain.Assessment, error) {
	var a domain.Assessment
	if err := r.db.GetContext(ctx, &a, db.QSelectAssessmentByToken, token); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrAssessmentNotFound
		}
		return nil, fmt.Errorf("select assessment by token: %w", err)
	}
	return &a, nil
}

// Update persists changes to an assessment.
func (r *assessmentRepo) Update(ctx context.Context, a *domain.Assessment) error {
	a.UpdatedAt = time.Now().UTC()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateAssessment, a)
	if err != nil {
		return mapPQError(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrAssessmentNotFound
	}
	return nil
}

// SoftDelete marks the row deleted.
func (r *assessmentRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	now := time.Now().UTC()
	q := `UPDATE app.assessments SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL`
	res, err := r.db.ExecContext(ctx, q, id, now)
	if err != nil {
		return fmt.Errorf("soft delete assessment: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrAssessmentNotFound
	}
	return nil
}

// List returns a page of assessments filtered by criteria.
func (r *assessmentRepo) List(ctx context.Context, f ListFilter) ([]*domain.Assessment, int, error) {
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

	if f.EmployeeID != nil {
		where = append(where, fmt.Sprintf("employee_id = $%d", idx))
		args = append(args, *f.EmployeeID)
		idx++
	}
	if f.InstrumentCode != "" {
		where = append(where, fmt.Sprintf("instrument_code = $%d", idx))
		args = append(args, f.InstrumentCode)
		idx++
	}
	if f.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}

	clause := strings.Join(where, " AND ")

	countQ := "SELECT COUNT(*) FROM app.assessments WHERE " + clause
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count assessments: %w", err)
	}

	listQ := fmt.Sprintf(
		"SELECT %s FROM app.assessments WHERE %s ORDER BY %s %s LIMIT $%d OFFSET $%d",
		db.AssessmentCols, clause, sortCol, sortDir, idx, idx+1,
	)
	args = append(args, f.Limit, offset)

	rows := []*domain.Assessment{}
	if err := r.db.SelectContext(ctx, &rows, listQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list assessments: %w", err)
	}
	return rows, total, nil
}

func normaliseSortCol(col string) string {
	switch strings.ToLower(strings.TrimSpace(col)) {
	case "instrument_code", "status", "created_at", "updated_at", "expires_at":
		return strings.ToLower(strings.TrimSpace(col))
	}
	return "created_at"
}

func mapPQError(err error) error {
	var pqe *pq.Error
	if errors.As(err, &pqe) {
		switch pqe.Code {
		case "23505":
			return domain.ErrConflict
		case "23514":
			return fmt.Errorf("check constraint: %s", pqe.Message)
		}
	}
	return fmt.Errorf("db error: %w", err)
}

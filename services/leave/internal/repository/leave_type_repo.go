package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/leave/internal/db"
	"github.com/upcore/leave/internal/domain"
)

// Querier is a narrow interface implemented by *sqlx.DB and *sqlx.Tx.
type Querier interface {
	NamedExecContext(ctx context.Context, query string, arg any) (sql.Result, error)
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// LeaveTypeRepository abstracts leave-type persistence.
type LeaveTypeRepository interface {
	Create(ctx context.Context, tx Querier, lt *domain.LeaveType) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.LeaveType, error)
	GetByCode(ctx context.Context, code string, tenantID uuid.UUID) (*domain.LeaveType, error)
	ListForTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.LeaveType, error)
	Update(ctx context.Context, lt *domain.LeaveType) error
	Deactivate(ctx context.Context, id uuid.UUID) error
}

type leaveTypeRepo struct {
	db *sqlx.DB
}

// NewLeaveTypeRepository constructs a leave-type repository.
func NewLeaveTypeRepository(d *sqlx.DB) LeaveTypeRepository {
	return &leaveTypeRepo{db: d}
}

func (r *leaveTypeRepo) Create(ctx context.Context, tx Querier, lt *domain.LeaveType) error {
	if tx == nil {
		tx = r.db
	}
	if lt.ID == uuid.Nil {
		lt.ID = uuid.New()
	}
	if _, err := tx.NamedExecContext(ctx, db.QInsertLeaveType, lt); err != nil {
		return fmt.Errorf("insert leave_type: %w", err)
	}
	return nil
}

func (r *leaveTypeRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.LeaveType, error) {
	var lt domain.LeaveType
	if err := r.db.GetContext(ctx, &lt, db.QSelectLeaveTypeByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrLeaveTypeNotFound
		}
		return nil, fmt.Errorf("select leave_type: %w", err)
	}
	return &lt, nil
}

func (r *leaveTypeRepo) GetByCode(ctx context.Context, code string, tenantID uuid.UUID) (*domain.LeaveType, error) {
	var lt domain.LeaveType
	if err := r.db.GetContext(ctx, &lt, db.QSelectLeaveTypeByCode, code, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrLeaveTypeNotFound
		}
		return nil, fmt.Errorf("select leave_type by code: %w", err)
	}
	return &lt, nil
}

func (r *leaveTypeRepo) ListForTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.LeaveType, error) {
	var out []*domain.LeaveType
	if err := r.db.SelectContext(ctx, &out, db.QListLeaveTypesForTenant, tenantID); err != nil {
		return nil, fmt.Errorf("list leave_types: %w", err)
	}
	return out, nil
}

func (r *leaveTypeRepo) Update(ctx context.Context, lt *domain.LeaveType) error {
	res, err := r.db.NamedExecContext(ctx, db.QUpdateLeaveType, lt)
	if err != nil {
		return fmt.Errorf("update leave_type: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrLeaveTypeNotFound
	}
	return nil
}

func (r *leaveTypeRepo) Deactivate(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, db.QDeactivateLeaveType, id)
	if err != nil {
		return fmt.Errorf("deactivate leave_type: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrLeaveTypeNotFound
	}
	return nil
}

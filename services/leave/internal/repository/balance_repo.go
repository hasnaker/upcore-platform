package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/leave/internal/db"
	"github.com/upcore/leave/internal/domain"
)

// BalanceDelta describes an in-place balance adjustment.
type BalanceDelta struct {
	Accrued     float64
	Used        float64
	Pending     float64
	Adjusted    float64
	CarriedOver float64
	TouchAccrual bool
}

// LeaveBalanceRepository abstracts balance persistence.
type LeaveBalanceRepository interface {
	Create(ctx context.Context, tx Querier, b *domain.LeaveBalance) error
	Get(ctx context.Context, tenantID, employeeID, leaveTypeID uuid.UUID, year int) (*domain.LeaveBalance, error)
	GetForUpdate(ctx context.Context, tx Querier, tenantID, employeeID, leaveTypeID uuid.UUID, year int) (*domain.LeaveBalance, error)
	ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID, year int) ([]*domain.LeaveBalance, error)
	ApplyDelta(ctx context.Context, tx Querier, tenantID, employeeID, leaveTypeID uuid.UUID, year int, delta BalanceDelta) (float64, error)
	UpdateAbsolute(ctx context.Context, tx Querier, b *domain.LeaveBalance) error
	Upsert(ctx context.Context, tx Querier, b *domain.LeaveBalance) error
}

type balanceRepo struct {
	db *sqlx.DB
}

// NewLeaveBalanceRepository constructs a balance repository.
func NewLeaveBalanceRepository(d *sqlx.DB) LeaveBalanceRepository {
	return &balanceRepo{db: d}
}

func (r *balanceRepo) Create(ctx context.Context, tx Querier, b *domain.LeaveBalance) error {
	if tx == nil {
		tx = r.db
	}
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	now := time.Now().UTC()
	if b.CreatedAt.IsZero() {
		b.CreatedAt = now
	}
	b.UpdatedAt = now
	if _, err := tx.NamedExecContext(ctx, db.QInsertLeaveBalance, b); err != nil {
		return fmt.Errorf("insert leave_balance: %w", err)
	}
	return nil
}

func (r *balanceRepo) Get(ctx context.Context, tenantID, employeeID, leaveTypeID uuid.UUID, year int) (*domain.LeaveBalance, error) {
	var b domain.LeaveBalance
	if err := r.db.GetContext(ctx, &b, db.QSelectLeaveBalance, tenantID, employeeID, leaveTypeID, year); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrLeaveBalanceNotFound
		}
		return nil, fmt.Errorf("select leave_balance: %w", err)
	}
	return &b, nil
}

func (r *balanceRepo) GetForUpdate(ctx context.Context, tx Querier, tenantID, employeeID, leaveTypeID uuid.UUID, year int) (*domain.LeaveBalance, error) {
	if tx == nil {
		tx = r.db
	}
	var b domain.LeaveBalance
	if err := tx.GetContext(ctx, &b, db.QSelectLeaveBalanceForUpdate, tenantID, employeeID, leaveTypeID, year); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrLeaveBalanceNotFound
		}
		return nil, fmt.Errorf("select leave_balance for update: %w", err)
	}
	return &b, nil
}

func (r *balanceRepo) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID, year int) ([]*domain.LeaveBalance, error) {
	var out []*domain.LeaveBalance
	if err := r.db.SelectContext(ctx, &out, db.QListLeaveBalancesByEmployee, tenantID, employeeID, year); err != nil {
		return nil, fmt.Errorf("list leave_balances: %w", err)
	}
	return out, nil
}

func (r *balanceRepo) ApplyDelta(ctx context.Context, tx Querier, tenantID, employeeID, leaveTypeID uuid.UUID, year int, delta BalanceDelta) (float64, error) {
	if tx == nil {
		tx = r.db
	}
	var remaining float64
	err := tx.GetContext(ctx, &remaining, db.QUpdateLeaveBalanceDelta,
		tenantID, employeeID, leaveTypeID, year,
		delta.Accrued, delta.Used, delta.Pending, delta.Adjusted, delta.CarriedOver, delta.TouchAccrual)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, domain.ErrLeaveBalanceNotFound
		}
		return 0, fmt.Errorf("apply balance delta: %w", err)
	}
	return remaining, nil
}

func (r *balanceRepo) UpdateAbsolute(ctx context.Context, tx Querier, b *domain.LeaveBalance) error {
	if tx == nil {
		tx = r.db
	}
	res, err := tx.NamedExecContext(ctx, db.QUpdateLeaveBalanceAbsolute, b)
	if err != nil {
		return fmt.Errorf("update leave_balance absolute: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrLeaveBalanceNotFound
	}
	return nil
}

func (r *balanceRepo) Upsert(ctx context.Context, tx Querier, b *domain.LeaveBalance) error {
	// Try update; fall back to insert when not found.
	if err := r.UpdateAbsolute(ctx, tx, b); err != nil {
		if errors.Is(err, domain.ErrLeaveBalanceNotFound) {
			return r.Create(ctx, tx, b)
		}
		return err
	}
	return nil
}

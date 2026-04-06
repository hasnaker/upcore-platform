package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/upcore/leave/internal/db"
	"github.com/upcore/leave/internal/domain"
)

// LeaveRequestFilter narrows list queries.
type LeaveRequestFilter struct {
	EmployeeID *uuid.UUID
	Status     *domain.LeaveStatus
	Year       *int
	Limit      int
	Offset     int
}

// LeaveRequestRepository abstracts request persistence.
type LeaveRequestRepository interface {
	Create(ctx context.Context, tx Querier, r *domain.LeaveRequest) error
	Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.LeaveRequest, error)
	Update(ctx context.Context, tx Querier, r *domain.LeaveRequest) error
	UpdateStatus(ctx context.Context, tx Querier, tenantID, id uuid.UUID, status domain.LeaveStatus,
		approvedBy *uuid.UUID, approvedAt *time.Time, rejectedReason *string, cancelledAt *time.Time) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.LeaveRequest, error)
	ListByTenantStatus(ctx context.Context, tenantID uuid.UUID, status domain.LeaveStatus, limit, offset int) ([]*domain.LeaveRequest, error)
	ListOverlapping(ctx context.Context, tenantID, employeeID uuid.UUID, start, end time.Time, excludeID *uuid.UUID) ([]*domain.LeaveRequest, error)
	ListByDateRange(ctx context.Context, tenantID uuid.UUID, start, end time.Time) ([]*domain.LeaveRequest, error)
	ListForEmployees(ctx context.Context, tenantID uuid.UUID, employeeIDs []uuid.UUID, start, end time.Time) ([]*domain.LeaveRequest, error)
}

type requestRepo struct {
	db *sqlx.DB
}

// NewLeaveRequestRepository constructs the request repository.
func NewLeaveRequestRepository(d *sqlx.DB) LeaveRequestRepository {
	return &requestRepo{db: d}
}

func (r *requestRepo) Create(ctx context.Context, tx Querier, req *domain.LeaveRequest) error {
	if tx == nil {
		tx = r.db
	}
	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}
	now := time.Now().UTC()
	if req.CreatedAt.IsZero() {
		req.CreatedAt = now
	}
	req.UpdatedAt = now
	if req.RequestedAt.IsZero() {
		req.RequestedAt = now
	}
	if len(req.Metadata) == 0 {
		req.Metadata = domain.JSONB(`{}`)
	}
	if _, err := tx.NamedExecContext(ctx, db.QInsertLeaveRequest, req); err != nil {
		return fmt.Errorf("insert leave_request: %w", err)
	}
	return nil
}

func (r *requestRepo) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.LeaveRequest, error) {
	var req domain.LeaveRequest
	if err := r.db.GetContext(ctx, &req, db.QSelectLeaveRequestByID, id, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrLeaveRequestNotFound
		}
		return nil, fmt.Errorf("select leave_request: %w", err)
	}
	return &req, nil
}

func (r *requestRepo) Update(ctx context.Context, tx Querier, req *domain.LeaveRequest) error {
	if tx == nil {
		tx = r.db
	}
	req.UpdatedAt = time.Now().UTC()
	if len(req.Metadata) == 0 {
		req.Metadata = domain.JSONB(`{}`)
	}
	res, err := tx.NamedExecContext(ctx, db.QUpdateLeaveRequest, req)
	if err != nil {
		return fmt.Errorf("update leave_request: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrLeaveRequestNotFound
	}
	return nil
}

func (r *requestRepo) UpdateStatus(ctx context.Context, tx Querier, tenantID, id uuid.UUID, status domain.LeaveStatus,
	approvedBy *uuid.UUID, approvedAt *time.Time, rejectedReason *string, cancelledAt *time.Time) error {
	if tx == nil {
		tx = r.db
	}
	res, err := tx.ExecContext(ctx, db.QUpdateLeaveRequestStatus,
		id, tenantID, status, approvedBy, approvedAt, rejectedReason, cancelledAt)
	if err != nil {
		return fmt.Errorf("update leave_request status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrLeaveRequestNotFound
	}
	return nil
}

func (r *requestRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, db.QDeleteLeaveRequest, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete leave_request: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrLeaveRequestNotFound
	}
	return nil
}

func (r *requestRepo) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.LeaveRequest, error) {
	if limit <= 0 {
		limit = 50
	}
	var out []*domain.LeaveRequest
	if err := r.db.SelectContext(ctx, &out, db.QListRequestsByEmployee, tenantID, employeeID, limit, offset); err != nil {
		return nil, fmt.Errorf("list leave_requests by employee: %w", err)
	}
	return out, nil
}

func (r *requestRepo) ListByTenantStatus(ctx context.Context, tenantID uuid.UUID, status domain.LeaveStatus, limit, offset int) ([]*domain.LeaveRequest, error) {
	if limit <= 0 {
		limit = 50
	}
	var out []*domain.LeaveRequest
	if err := r.db.SelectContext(ctx, &out, db.QListRequestsByTenantStatus, tenantID, status, limit, offset); err != nil {
		return nil, fmt.Errorf("list leave_requests by status: %w", err)
	}
	return out, nil
}

func (r *requestRepo) ListOverlapping(ctx context.Context, tenantID, employeeID uuid.UUID, start, end time.Time, excludeID *uuid.UUID) ([]*domain.LeaveRequest, error) {
	var excl any
	if excludeID != nil {
		excl = *excludeID
	}
	var out []*domain.LeaveRequest
	if err := r.db.SelectContext(ctx, &out, db.QListOverlappingRequests, tenantID, employeeID, start, end, excl); err != nil {
		return nil, fmt.Errorf("list overlapping leave_requests: %w", err)
	}
	return out, nil
}

func (r *requestRepo) ListByDateRange(ctx context.Context, tenantID uuid.UUID, start, end time.Time) ([]*domain.LeaveRequest, error) {
	var out []*domain.LeaveRequest
	if err := r.db.SelectContext(ctx, &out, db.QListRequestsByDateRange, tenantID, start, end); err != nil {
		return nil, fmt.Errorf("list leave_requests by date range: %w", err)
	}
	return out, nil
}

func (r *requestRepo) ListForEmployees(ctx context.Context, tenantID uuid.UUID, employeeIDs []uuid.UUID, start, end time.Time) ([]*domain.LeaveRequest, error) {
	if len(employeeIDs) == 0 {
		return nil, nil
	}
	idStrings := make([]string, len(employeeIDs))
	for i, id := range employeeIDs {
		idStrings[i] = id.String()
	}
	var out []*domain.LeaveRequest
	if err := r.db.SelectContext(ctx, &out, db.QListRequestsForEmployees, tenantID, pq.Array(idStrings), start, end); err != nil {
		return nil, fmt.Errorf("list leave_requests for employees: %w", err)
	}
	return out, nil
}

package service

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/repository"
)

// fakeRequestRepo is an in-memory implementation of LeaveRequestRepository.
type fakeRequestRepo struct {
	items map[uuid.UUID]*domain.LeaveRequest
}

func newFakeRequestRepo() *fakeRequestRepo {
	return &fakeRequestRepo{items: map[uuid.UUID]*domain.LeaveRequest{}}
}

func (f *fakeRequestRepo) Create(_ context.Context, _ repository.Querier, r *domain.LeaveRequest) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	r.CreatedAt = time.Now().UTC()
	r.UpdatedAt = r.CreatedAt
	if r.RequestedAt.IsZero() {
		r.RequestedAt = r.CreatedAt
	}
	cp := *r
	f.items[r.ID] = &cp
	return nil
}

func (f *fakeRequestRepo) Get(_ context.Context, tenantID, id uuid.UUID) (*domain.LeaveRequest, error) {
	v, ok := f.items[id]
	if !ok || v.TenantID != tenantID {
		return nil, domain.ErrLeaveRequestNotFound
	}
	cp := *v
	return &cp, nil
}

func (f *fakeRequestRepo) Update(_ context.Context, _ repository.Querier, r *domain.LeaveRequest) error {
	if _, ok := f.items[r.ID]; !ok {
		return domain.ErrLeaveRequestNotFound
	}
	r.UpdatedAt = time.Now().UTC()
	cp := *r
	f.items[r.ID] = &cp
	return nil
}

func (f *fakeRequestRepo) UpdateStatus(_ context.Context, _ repository.Querier, tenantID, id uuid.UUID, status domain.LeaveStatus,
	approvedBy *uuid.UUID, approvedAt *time.Time, rejectedReason *string, cancelledAt *time.Time) error {
	v, ok := f.items[id]
	if !ok || v.TenantID != tenantID {
		return domain.ErrLeaveRequestNotFound
	}
	v.Status = status
	v.ApprovedBy = approvedBy
	v.ApprovedAt = approvedAt
	v.RejectedReason = rejectedReason
	v.CancelledAt = cancelledAt
	v.UpdatedAt = time.Now().UTC()
	return nil
}

func (f *fakeRequestRepo) Delete(_ context.Context, tenantID, id uuid.UUID) error {
	v, ok := f.items[id]
	if !ok || v.TenantID != tenantID {
		return domain.ErrLeaveRequestNotFound
	}
	delete(f.items, id)
	return nil
}

func (f *fakeRequestRepo) ListByEmployee(_ context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.LeaveRequest, error) {
	out := []*domain.LeaveRequest{}
	for _, v := range f.items {
		if v.TenantID == tenantID && v.EmployeeID == employeeID {
			cp := *v
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartDate.After(out[j].StartDate) })
	if offset >= len(out) {
		return nil, nil
	}
	end := offset + limit
	if end > len(out) {
		end = len(out)
	}
	return out[offset:end], nil
}

func (f *fakeRequestRepo) ListByTenantStatus(_ context.Context, tenantID uuid.UUID, status domain.LeaveStatus, limit, offset int) ([]*domain.LeaveRequest, error) {
	out := []*domain.LeaveRequest{}
	for _, v := range f.items {
		if v.TenantID == tenantID && v.Status == status {
			cp := *v
			out = append(out, &cp)
		}
	}
	if offset >= len(out) {
		return nil, nil
	}
	end := offset + limit
	if end > len(out) {
		end = len(out)
	}
	return out[offset:end], nil
}

func (f *fakeRequestRepo) ListOverlapping(_ context.Context, tenantID, employeeID uuid.UUID, start, end time.Time, excludeID *uuid.UUID) ([]*domain.LeaveRequest, error) {
	out := []*domain.LeaveRequest{}
	for _, v := range f.items {
		if v.TenantID != tenantID || v.EmployeeID != employeeID {
			continue
		}
		if !v.Status.CountsAgainstBalance() {
			continue
		}
		if excludeID != nil && v.ID == *excludeID {
			continue
		}
		if v.OverlapsWith(start, end) {
			cp := *v
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (f *fakeRequestRepo) ListByDateRange(_ context.Context, tenantID uuid.UUID, start, end time.Time) ([]*domain.LeaveRequest, error) {
	out := []*domain.LeaveRequest{}
	for _, v := range f.items {
		if v.TenantID != tenantID {
			continue
		}
		if v.OverlapsWith(start, end) {
			cp := *v
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (f *fakeRequestRepo) ListForEmployees(_ context.Context, tenantID uuid.UUID, employeeIDs []uuid.UUID, start, end time.Time) ([]*domain.LeaveRequest, error) {
	idSet := map[uuid.UUID]bool{}
	for _, id := range employeeIDs {
		idSet[id] = true
	}
	out := []*domain.LeaveRequest{}
	for _, v := range f.items {
		if v.TenantID != tenantID || !idSet[v.EmployeeID] {
			continue
		}
		if v.OverlapsWith(start, end) {
			cp := *v
			out = append(out, &cp)
		}
	}
	return out, nil
}

// fakeBalanceRepo is an in-memory implementation of LeaveBalanceRepository.
type fakeBalanceRepo struct {
	items map[string]*domain.LeaveBalance
}

func newFakeBalanceRepo() *fakeBalanceRepo {
	return &fakeBalanceRepo{items: map[string]*domain.LeaveBalance{}}
}

func balKey(tenantID, employeeID, leaveTypeID uuid.UUID, year int) string {
	return tenantID.String() + "|" + employeeID.String() + "|" + leaveTypeID.String() + "|" + time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006")
}

func (f *fakeBalanceRepo) computeRemaining(b *domain.LeaveBalance) {
	b.RemainingDays = b.AccruedDays + b.CarriedOver + b.AdjustedDays - b.UsedDays - b.PendingDays
}

func (f *fakeBalanceRepo) Create(_ context.Context, _ repository.Querier, b *domain.LeaveBalance) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	now := time.Now().UTC()
	b.CreatedAt = now
	b.UpdatedAt = now
	f.computeRemaining(b)
	cp := *b
	f.items[balKey(b.TenantID, b.EmployeeID, b.LeaveTypeID, b.Year)] = &cp
	return nil
}

func (f *fakeBalanceRepo) Get(_ context.Context, tenantID, employeeID, leaveTypeID uuid.UUID, year int) (*domain.LeaveBalance, error) {
	v, ok := f.items[balKey(tenantID, employeeID, leaveTypeID, year)]
	if !ok {
		return nil, domain.ErrLeaveBalanceNotFound
	}
	cp := *v
	return &cp, nil
}

func (f *fakeBalanceRepo) GetForUpdate(ctx context.Context, _ repository.Querier, tenantID, employeeID, leaveTypeID uuid.UUID, year int) (*domain.LeaveBalance, error) {
	return f.Get(ctx, tenantID, employeeID, leaveTypeID, year)
}

func (f *fakeBalanceRepo) ListByEmployee(_ context.Context, tenantID, employeeID uuid.UUID, year int) ([]*domain.LeaveBalance, error) {
	out := []*domain.LeaveBalance{}
	for _, v := range f.items {
		if v.TenantID == tenantID && v.EmployeeID == employeeID && v.Year == year {
			cp := *v
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (f *fakeBalanceRepo) ApplyDelta(_ context.Context, _ repository.Querier, tenantID, employeeID, leaveTypeID uuid.UUID, year int, delta repository.BalanceDelta) (float64, error) {
	v, ok := f.items[balKey(tenantID, employeeID, leaveTypeID, year)]
	if !ok {
		return 0, domain.ErrLeaveBalanceNotFound
	}
	v.AccruedDays += delta.Accrued
	v.UsedDays += delta.Used
	v.PendingDays += delta.Pending
	v.AdjustedDays += delta.Adjusted
	v.CarriedOver += delta.CarriedOver
	if delta.TouchAccrual {
		now := time.Now().UTC()
		v.LastAccrualAt = &now
	}
	v.UpdatedAt = time.Now().UTC()
	f.computeRemaining(v)
	return v.RemainingDays, nil
}

func (f *fakeBalanceRepo) UpdateAbsolute(_ context.Context, _ repository.Querier, b *domain.LeaveBalance) error {
	v, ok := f.items[balKey(b.TenantID, b.EmployeeID, b.LeaveTypeID, b.Year)]
	if !ok {
		return domain.ErrLeaveBalanceNotFound
	}
	v.AccruedDays = b.AccruedDays
	v.UsedDays = b.UsedDays
	v.PendingDays = b.PendingDays
	v.CarriedOver = b.CarriedOver
	v.AdjustedDays = b.AdjustedDays
	v.LastAccrualAt = b.LastAccrualAt
	v.UpdatedAt = time.Now().UTC()
	f.computeRemaining(v)
	return nil
}

func (f *fakeBalanceRepo) Upsert(ctx context.Context, q repository.Querier, b *domain.LeaveBalance) error {
	if err := f.UpdateAbsolute(ctx, q, b); err != nil {
		if errors.Is(err, domain.ErrLeaveBalanceNotFound) {
			return f.Create(ctx, q, b)
		}
		return err
	}
	return nil
}

// fakeTypeRepo is an in-memory implementation of LeaveTypeRepository.
type fakeTypeRepo struct {
	byID   map[uuid.UUID]*domain.LeaveType
	byCode map[string]*domain.LeaveType
}

func newFakeTypeRepo() *fakeTypeRepo {
	return &fakeTypeRepo{byID: map[uuid.UUID]*domain.LeaveType{}, byCode: map[string]*domain.LeaveType{}}
}

func (f *fakeTypeRepo) seed(lt *domain.LeaveType) {
	if lt.ID == uuid.Nil {
		lt.ID = uuid.New()
	}
	f.byID[lt.ID] = lt
	f.byCode[lt.Code] = lt
}

func (f *fakeTypeRepo) Create(_ context.Context, _ repository.Querier, lt *domain.LeaveType) error {
	f.seed(lt)
	return nil
}

func (f *fakeTypeRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.LeaveType, error) {
	v, ok := f.byID[id]
	if !ok {
		return nil, domain.ErrLeaveTypeNotFound
	}
	cp := *v
	return &cp, nil
}

func (f *fakeTypeRepo) GetByCode(_ context.Context, code string, _ uuid.UUID) (*domain.LeaveType, error) {
	v, ok := f.byCode[code]
	if !ok {
		return nil, domain.ErrLeaveTypeNotFound
	}
	cp := *v
	return &cp, nil
}

func (f *fakeTypeRepo) ListForTenant(_ context.Context, _ uuid.UUID) ([]*domain.LeaveType, error) {
	out := []*domain.LeaveType{}
	for _, v := range f.byID {
		cp := *v
		out = append(out, &cp)
	}
	return out, nil
}

func (f *fakeTypeRepo) Update(_ context.Context, lt *domain.LeaveType) error {
	if _, ok := f.byID[lt.ID]; !ok {
		return domain.ErrLeaveTypeNotFound
	}
	cp := *lt
	f.byID[lt.ID] = &cp
	f.byCode[lt.Code] = &cp
	return nil
}

func (f *fakeTypeRepo) Deactivate(_ context.Context, id uuid.UUID) error {
	v, ok := f.byID[id]
	if !ok {
		return domain.ErrLeaveTypeNotFound
	}
	v.Active = false
	return nil
}

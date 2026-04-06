package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/event"
	"github.com/upcore/leave/internal/repository"
)

// seed sets up fakes with a yıllık leave type + balance for a known employee.
func seed(t *testing.T) (ctx context.Context, tenantID, empID uuid.UUID, reqs *fakeRequestRepo, bals *fakeBalanceRepo, types *fakeTypeRepo, pub *event.InMemoryPublisher, svc *LeaveService) {
	t.Helper()
	ctx = context.Background()
	tenantID = uuid.New()
	empID = uuid.New()
	reqs = newFakeRequestRepo()
	bals = newFakeBalanceRepo()
	types = newFakeTypeRepo()
	pub = event.NewInMemoryPublisher()

	yillik := &domain.LeaveType{
		ID: uuid.New(), Code: domain.CodeYillik1_5Yil, NameTR: "Yıllık İzin",
		Category: domain.CategoryYillik, IsPaid: true, CarryOverAllowed: true,
		MaxDaysPerYear: intPtr(14), Active: true, MinTenureMonths: 12,
	}
	types.seed(yillik)
	// seed a balance with 14 days accrued
	_ = bals.Create(ctx, nil, &domain.LeaveBalance{
		TenantID: tenantID, EmployeeID: empID, LeaveTypeID: yillik.ID,
		Year: 2026, AccruedDays: 14,
	})

	// also seed hastalık
	hastalik := &domain.LeaveType{
		ID: uuid.New(), Code: domain.CodeHastalik, NameTR: "Hastalık",
		Category: domain.CategoryHastalik, IsPaid: true, RequiresDocument: false, Active: true,
	}
	types.seed(hastalik)

	svc = NewLeaveService(NoopTxRunner{}, reqs, bals, types, pub, 3, zerolog.Nop())
	return
}

func intPtr(i int) *int { return &i }

func TestSubmit_Success_ReservesBalance(t *testing.T) {
	ctx, tenantID, empID, _, bals, types, pub, svc := seed(t)

	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)
	// 2026-01-05 (Mon) — 2026-01-09 (Fri) = 5 working days
	start := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC)

	req, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID, StartDate: start, EndDate: end,
	})
	require.NoError(t, err)
	assert.Equal(t, 5.0, req.TotalDays)
	assert.Equal(t, domain.StatusPending, req.Status)
	// balance: pending 5, remaining 9
	bal, _ := bals.Get(ctx, tenantID, empID, lt.ID, 2026)
	assert.Equal(t, 5.0, bal.PendingDays)
	assert.Equal(t, 9.0, bal.RemainingDays)
	// event published
	assert.Equal(t, 1, pub.Count(event.TopicRequestSubmitted))
}

func TestSubmit_InsufficientBalance(t *testing.T) {
	ctx, tenantID, empID, _, _, types, _, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	start := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 2, 6, 0, 0, 0, 0, time.UTC) // way more than 14

	_, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID, StartDate: start, EndDate: end,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrInsufficientBalance))
}

func TestSubmit_OverlapRejected(t *testing.T) {
	ctx, tenantID, empID, _, _, types, _, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	start := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC)
	_, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID, StartDate: start, EndDate: end,
	})
	require.NoError(t, err)
	// second overlapping
	_, err = svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate: time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 12, 0, 0, 0, 0, time.UTC),
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrOverlappingRequest))
}

func TestSubmit_HalfDays(t *testing.T) {
	ctx, tenantID, empID, _, _, types, _, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	// 5 days → half-day start + half-day end → 4 days
	req, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate:    time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
		EndDate:      time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC),
		StartHalfDay: true, EndHalfDay: true,
	})
	require.NoError(t, err)
	assert.Equal(t, 4.0, req.TotalDays)
}

func TestSubmit_RejectsInvalidDateRange(t *testing.T) {
	ctx, tenantID, empID, _, _, types, _, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	_, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate: time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrInvalidDateRange))
}

func TestCancel_ReleasesPendingBalance(t *testing.T) {
	ctx, tenantID, empID, _, bals, types, pub, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	req, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate: time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 9, 0, 0, 0, 0, time.UTC),
	})
	require.NoError(t, err)

	err = svc.Cancel(ctx, tenantID, req.ID, uuid.New())
	require.NoError(t, err)
	bal, _ := bals.Get(ctx, tenantID, empID, lt.ID, 2026)
	assert.Equal(t, 0.0, bal.PendingDays)
	assert.Equal(t, 14.0, bal.RemainingDays)
	assert.Equal(t, 1, pub.Count(event.TopicRequestCancelled))
}

func TestApprove_Flow_ShortLeave(t *testing.T) {
	ctx, tenantID, empID, _, bals, types, pub, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	req, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate: time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC), // 3 days
	})
	require.NoError(t, err)

	// instantiate the approval service using the SAME fakes injected into svc.
	appr := NewApprovalService(NoopTxRunner{}, svcRequestsRepo(svc), bals, types, pub, 5, zerolog.Nop())

	// Short leave (<=5) with yıllık → should skip HR stage → final approved
	manager := uuid.New()
	resp, err := appr.Approve(ctx, tenantID, req.ID, manager, uuid.New(), domain.RoleManager)
	require.NoError(t, err)
	assert.Equal(t, domain.StatusApproved, resp.Status)
	bal, _ := bals.Get(ctx, tenantID, empID, lt.ID, 2026)
	assert.Equal(t, 3.0, bal.UsedDays)
	assert.Equal(t, 0.0, bal.PendingDays)
	assert.Equal(t, 1, pub.Count(event.TopicRequestApproved))
}

func TestApprove_Flow_LongLeaveNeedsHR(t *testing.T) {
	ctx, tenantID, empID, _, _, types, _, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	// Submit 7-day leave
	req, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate: time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 13, 0, 0, 0, 0, time.UTC), // 7 working days
	})
	require.NoError(t, err)

	appr := NewApprovalService(NoopTxRunner{}, svcRequestsRepo(svc), svcBalancesRepo(svc), types, event.NewInMemoryPublisher(), 5, zerolog.Nop())
	// Manager approve → should go to manager_approved (not final)
	res, err := appr.Approve(ctx, tenantID, req.ID, uuid.New(), uuid.New(), domain.RoleManager)
	require.NoError(t, err)
	assert.Equal(t, domain.StatusManagerApproved, res.Status)
	// HR approve → final
	res, err = appr.Approve(ctx, tenantID, req.ID, uuid.New(), uuid.New(), domain.RoleHR)
	require.NoError(t, err)
	assert.Equal(t, domain.StatusApproved, res.Status)
}

func TestApprove_SelfApprovalBlocked(t *testing.T) {
	ctx, tenantID, empID, _, _, types, _, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	req, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate: time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC),
	})
	require.NoError(t, err)

	appr := NewApprovalService(NoopTxRunner{}, svcRequestsRepo(svc), svcBalancesRepo(svc), types, event.NewInMemoryPublisher(), 5, zerolog.Nop())
	// Actor's employee ID equals the request's employee — self approval blocked
	_, err = appr.Approve(ctx, tenantID, req.ID, uuid.New(), empID, domain.RoleManager)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrSelfApproval))
}

func TestReject_ReleasesBalance(t *testing.T) {
	ctx, tenantID, empID, _, bals, types, _, svc := seed(t)
	lt, _ := types.GetByCode(ctx, domain.CodeYillik1_5Yil, tenantID)

	req, err := svc.Submit(ctx, tenantID, SubmitInput{
		EmployeeID: empID, LeaveTypeID: lt.ID,
		StartDate: time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 7, 0, 0, 0, 0, time.UTC), // 3 days
	})
	require.NoError(t, err)

	appr := NewApprovalService(NoopTxRunner{}, svcRequestsRepo(svc), bals, types, event.NewInMemoryPublisher(), 5, zerolog.Nop())
	_, err = appr.Reject(ctx, tenantID, req.ID, uuid.New(), uuid.New(), domain.RoleManager, "team too busy")
	require.NoError(t, err)
	bal, _ := bals.Get(ctx, tenantID, empID, lt.ID, 2026)
	assert.Equal(t, 0.0, bal.PendingDays)
	assert.Equal(t, 14.0, bal.RemainingDays)
}

// helpers to reach private fields: since our fakes exist, we can reuse them.
// Below we use shared-state accessors that return the services' injected repos.
// To keep tests simple we embed via a wrapper.

func svcRequestsRepo(svc *LeaveService) repository.LeaveRequestRepository { return svc.requests }
func svcBalancesRepo(svc *LeaveService) repository.LeaveBalanceRepository { return svc.balances }

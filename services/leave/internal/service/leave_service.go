package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/leave/internal/calculator"
	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/event"
	"github.com/upcore/leave/internal/repository"
)

// SubmitInput carries validated inputs for submitting a leave request.
type SubmitInput struct {
	EmployeeID   uuid.UUID `json:"employee_id" validate:"required"`
	LeaveTypeID  uuid.UUID `json:"leave_type_id" validate:"required"`
	StartDate    time.Time `json:"start_date" validate:"required"`
	EndDate      time.Time `json:"end_date" validate:"required"`
	StartHalfDay bool      `json:"start_half_day"`
	EndHalfDay   bool      `json:"end_half_day"`
	Reason       *string   `json:"reason,omitempty"`
	DocumentURLs []string  `json:"document_urls,omitempty"`
	AsDraft      bool      `json:"as_draft,omitempty"`
}

// UpdateInput carries patchable request fields.
type UpdateInput struct {
	StartDate    *time.Time `json:"start_date,omitempty"`
	EndDate      *time.Time `json:"end_date,omitempty"`
	StartHalfDay *bool      `json:"start_half_day,omitempty"`
	EndHalfDay   *bool      `json:"end_half_day,omitempty"`
	Reason       *string    `json:"reason,omitempty"`
	DocumentURLs []string   `json:"document_urls,omitempty"`
	LeaveTypeID  *uuid.UUID `json:"leave_type_id,omitempty"`
}

// LeaveService orchestrates leave-request lifecycle.
type LeaveService struct {
	tx        TxRunner
	requests  repository.LeaveRequestRepository
	balances  repository.LeaveBalanceRepository
	types     repository.LeaveTypeRepository
	publisher event.Publisher
	medCert   int
	log       zerolog.Logger
}

// NewLeaveService constructs the service.
func NewLeaveService(
	tx TxRunner,
	requests repository.LeaveRequestRepository,
	balances repository.LeaveBalanceRepository,
	types repository.LeaveTypeRepository,
	publisher event.Publisher,
	medicalCertMinDays int,
	log zerolog.Logger,
) *LeaveService {
	return &LeaveService{
		tx: tx, requests: requests, balances: balances, types: types,
		publisher: publisher, medCert: medicalCertMinDays, log: log,
	}
}

// Submit validates input, computes working days, checks overlap + balance, and
// persists a new request. When as_draft is false, it reserves pending balance
// atomically and publishes leave.request.submitted.v1.
func (s *LeaveService) Submit(ctx context.Context, tenantID uuid.UUID, in SubmitInput) (*domain.LeaveRequest, error) {
	if in.EndDate.Before(in.StartDate) {
		return nil, domain.ErrInvalidDateRange
	}
	lt, err := s.types.GetByID(ctx, in.LeaveTypeID)
	if err != nil {
		return nil, err
	}
	// Calculate working days (weekends + resmi tatiller excluded)
	holidays := calculator.TurkishPublicHolidays(in.StartDate.Year())
	if in.EndDate.Year() != in.StartDate.Year() {
		holidays = append(holidays, calculator.TurkishPublicHolidays(in.EndDate.Year())...)
	}
	hSet := calculator.BuildHolidaySet(holidays)
	days := calculator.LeaveDays(in.StartDate, in.EndDate, in.StartHalfDay, in.EndHalfDay, hSet)
	if days <= 0 {
		return nil, domain.NewValidationError(map[string]string{"dates": "no working days in range"})
	}

	// Document requirement
	if lt.RequiresDocument && len(in.DocumentURLs) == 0 {
		return nil, domain.ErrDocumentRequired
	}
	// Hastalık >3 gün → medical cert required
	if lt.Category == domain.CategoryHastalik && int(days) >= s.medCert && len(in.DocumentURLs) == 0 {
		return nil, domain.ErrDocumentRequired
	}

	// Overlap check
	overlaps, err := s.requests.ListOverlapping(ctx, tenantID, in.EmployeeID, in.StartDate, in.EndDate, nil)
	if err != nil {
		return nil, err
	}
	if len(overlaps) > 0 {
		return nil, domain.ErrOverlappingRequest
	}

	status := domain.StatusPending
	if in.AsDraft {
		status = domain.StatusDraft
	}

	req := &domain.LeaveRequest{
		ID:           uuid.New(),
		TenantID:     tenantID,
		EmployeeID:   in.EmployeeID,
		LeaveTypeID:  in.LeaveTypeID,
		StartDate:    in.StartDate,
		EndDate:      in.EndDate,
		StartHalfDay: in.StartHalfDay,
		EndHalfDay:   in.EndHalfDay,
		TotalDays:    days,
		Reason:       in.Reason,
		Status:       status,
		DocumentURLs: in.DocumentURLs,
	}

	err = s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		if err := s.requests.Create(ctx, tx, req); err != nil {
			return err
		}
		// Reserve balance (pending) only for annual leave types that track balance.
		if status.CountsAgainstBalance() && lt.IsYillik() {
			year := in.StartDate.Year()
			bal, err := s.balances.GetForUpdate(ctx, tx, tenantID, in.EmployeeID, lt.ID, year)
			if err != nil {
				if errors.Is(err, domain.ErrLeaveBalanceNotFound) {
					return domain.ErrInsufficientBalance
				}
				return err
			}
			if !bal.CanConsume(days) {
				return domain.ErrInsufficientBalance
			}
			if _, err := s.balances.ApplyDelta(ctx, tx, tenantID, in.EmployeeID, lt.ID, year,
				repository.BalanceDelta{Pending: days}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if status == domain.StatusPending {
		_ = s.publisher.Publish(ctx, event.TopicRequestSubmitted, event.RequestSubmitted{
			RequestID: req.ID, TenantID: tenantID, EmployeeID: in.EmployeeID,
			LeaveTypeID: in.LeaveTypeID, StartDate: in.StartDate, EndDate: in.EndDate,
			TotalDays: days, SubmittedAt: req.RequestedAt,
		})
	}
	return req, nil
}

// Get retrieves a single request, tenant-scoped.
func (s *LeaveService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.LeaveRequest, error) {
	return s.requests.Get(ctx, tenantID, id)
}

// List lists requests for an employee.
func (s *LeaveService) List(ctx context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.LeaveRequest, error) {
	return s.requests.ListByEmployee(ctx, tenantID, employeeID, limit, offset)
}

// ListByStatus lists requests filtered by status (e.g. for HR inbox).
func (s *LeaveService) ListByStatus(ctx context.Context, tenantID uuid.UUID, status domain.LeaveStatus, limit, offset int) ([]*domain.LeaveRequest, error) {
	return s.requests.ListByTenantStatus(ctx, tenantID, status, limit, offset)
}

// Update patches a pending/draft request.
func (s *LeaveService) Update(ctx context.Context, tenantID, id uuid.UUID, in UpdateInput) (*domain.LeaveRequest, error) {
	req, err := s.requests.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !req.CanUpdate() {
		return nil, domain.ErrCannotUpdate
	}
	if in.StartDate != nil {
		req.StartDate = *in.StartDate
	}
	if in.EndDate != nil {
		req.EndDate = *in.EndDate
	}
	if in.StartHalfDay != nil {
		req.StartHalfDay = *in.StartHalfDay
	}
	if in.EndHalfDay != nil {
		req.EndHalfDay = *in.EndHalfDay
	}
	if in.Reason != nil {
		req.Reason = in.Reason
	}
	if in.DocumentURLs != nil {
		req.DocumentURLs = in.DocumentURLs
	}
	if in.LeaveTypeID != nil {
		req.LeaveTypeID = *in.LeaveTypeID
	}
	if err := req.ValidateDates(); err != nil {
		return nil, err
	}
	holidays := calculator.TurkishPublicHolidays(req.StartDate.Year())
	if req.EndDate.Year() != req.StartDate.Year() {
		holidays = append(holidays, calculator.TurkishPublicHolidays(req.EndDate.Year())...)
	}
	hSet := calculator.BuildHolidaySet(holidays)
	newDays := calculator.LeaveDays(req.StartDate, req.EndDate, req.StartHalfDay, req.EndHalfDay, hSet)
	if newDays <= 0 {
		return nil, domain.NewValidationError(map[string]string{"dates": "no working days in range"})
	}
	oldDays := req.TotalDays
	req.TotalDays = newDays

	err = s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		if err := s.requests.Update(ctx, tx, req); err != nil {
			return err
		}
		// Adjust pending reservation if applicable
		lt, err := s.types.GetByID(ctx, req.LeaveTypeID)
		if err != nil {
			return err
		}
		if req.Status.CountsAgainstBalance() && lt.IsYillik() && newDays != oldDays {
			delta := newDays - oldDays
			if _, err := s.balances.ApplyDelta(ctx, tx, tenantID, req.EmployeeID, lt.ID, req.StartDate.Year(),
				repository.BalanceDelta{Pending: delta}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return req, nil
}

// Cancel cancels a request. Releases reserved balance.
func (s *LeaveService) Cancel(ctx context.Context, tenantID, id, actorID uuid.UUID) error {
	req, err := s.requests.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if !req.CanCancel() {
		return domain.ErrCannotCancel
	}
	now := time.Now().UTC()

	return s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		err := s.requests.UpdateStatus(ctx, tx, tenantID, id, domain.StatusCancelled,
			nil, nil, nil, &now)
		if err != nil {
			return err
		}
		lt, err := s.types.GetByID(ctx, req.LeaveTypeID)
		if err != nil {
			return err
		}
		if req.Status.CountsAgainstBalance() && lt.IsYillik() {
			delta := repository.BalanceDelta{}
			if req.Status == domain.StatusApproved || req.Status == domain.StatusTaken {
				delta.Used = -req.TotalDays
			} else {
				delta.Pending = -req.TotalDays
			}
			if _, err := s.balances.ApplyDelta(ctx, tx, tenantID, req.EmployeeID, lt.ID, req.StartDate.Year(), delta); err != nil {
				return err
			}
		}
		_ = s.publisher.Publish(ctx, event.TopicRequestCancelled, event.RequestCancelled{
			RequestID: id, TenantID: tenantID, EmployeeID: req.EmployeeID,
			CancelledBy: actorID, CancelledAt: now,
		})
		return nil
	})
}

// Delete removes a draft request. Pending/approved requests must be cancelled.
func (s *LeaveService) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	req, err := s.requests.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if req.Status != domain.StatusDraft {
		return fmt.Errorf("%w: drafts only", domain.ErrCannotUpdate)
	}
	return s.requests.Delete(ctx, tenantID, id)
}

// TeamCalendar lists all active leaves for a set of employees in a date range.
func (s *LeaveService) TeamCalendar(ctx context.Context, tenantID uuid.UUID, employeeIDs []uuid.UUID, start, end time.Time) ([]*domain.LeaveRequest, error) {
	return s.requests.ListForEmployees(ctx, tenantID, employeeIDs, start, end)
}

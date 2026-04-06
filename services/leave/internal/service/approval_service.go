package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/event"
	"github.com/upcore/leave/internal/repository"
)

// ApprovalService handles manager/HR approvals and state transitions.
type ApprovalService struct {
	tx                   TxRunner
	requests             repository.LeaveRequestRepository
	balances             repository.LeaveBalanceRepository
	types                repository.LeaveTypeRepository
	publisher            event.Publisher
	requireHRApprovalMin int // days above this threshold require HR approval
	log                  zerolog.Logger
}

// NewApprovalService constructs the service.
func NewApprovalService(
	tx TxRunner,
	requests repository.LeaveRequestRepository,
	balances repository.LeaveBalanceRepository,
	types repository.LeaveTypeRepository,
	publisher event.Publisher,
	requireHRApprovalMin int,
	log zerolog.Logger,
) *ApprovalService {
	return &ApprovalService{
		tx: tx, requests: requests, balances: balances, types: types,
		publisher: publisher, requireHRApprovalMin: requireHRApprovalMin, log: log,
	}
}

// Approve transitions pending → manager_approved → approved based on actor role.
// Self-approval is forbidden (actorEmployeeID != req.EmployeeID).
func (s *ApprovalService) Approve(ctx context.Context, tenantID, requestID, actorID uuid.UUID, actorEmployeeID uuid.UUID, role domain.ApproverRole) (*domain.LeaveRequest, error) {
	req, err := s.requests.Get(ctx, tenantID, requestID)
	if err != nil {
		return nil, err
	}
	if actorEmployeeID != uuid.Nil && actorEmployeeID == req.EmployeeID {
		return nil, domain.ErrSelfApproval
	}
	if req.Status.IsTerminal() {
		return nil, domain.ErrRequestAlreadyHandled
	}

	// Determine target state
	target, ok := domain.CanTransition(req.Status, "approve", role)
	if !ok {
		return nil, domain.ErrWrongApprover
	}

	// Skip HR stage when HR approval not required (short leaves, non-yıllık)
	if target == domain.StatusManagerApproved && !s.requiresHR(ctx, req) {
		target = domain.StatusApproved
	}
	now := time.Now().UTC()
	final := target == domain.StatusApproved

	err = s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		var approvedBy *uuid.UUID
		var approvedAt *time.Time
		if final {
			approvedBy = &actorID
			approvedAt = &now
		}
		if err := s.requests.UpdateStatus(ctx, tx, tenantID, requestID, target,
			approvedBy, approvedAt, nil, nil); err != nil {
			return err
		}
		if !final {
			return nil
		}
		// Move pending → used on final approval (for annual leave balance)
		lt, err := s.types.GetByID(ctx, req.LeaveTypeID)
		if err != nil {
			return err
		}
		if lt.IsYillik() {
			if _, err := s.balances.ApplyDelta(ctx, tx, tenantID, req.EmployeeID, lt.ID, req.StartDate.Year(),
				repository.BalanceDelta{Pending: -req.TotalDays, Used: req.TotalDays}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	_ = s.publisher.Publish(ctx, event.TopicRequestApproved, event.RequestApproved{
		RequestID: requestID, TenantID: tenantID, EmployeeID: req.EmployeeID,
		ApproverID: actorID, ApproverRole: string(role), ApprovedAt: now, Final: final,
	})
	req.Status = target
	if final {
		req.ApprovedBy = &actorID
		req.ApprovedAt = &now
	}
	return req, nil
}

// Reject rejects a pending/manager_approved request.
func (s *ApprovalService) Reject(ctx context.Context, tenantID, requestID, actorID, actorEmployeeID uuid.UUID, role domain.ApproverRole, reason string) (*domain.LeaveRequest, error) {
	req, err := s.requests.Get(ctx, tenantID, requestID)
	if err != nil {
		return nil, err
	}
	if actorEmployeeID != uuid.Nil && actorEmployeeID == req.EmployeeID {
		return nil, domain.ErrSelfApproval
	}
	if req.Status.IsTerminal() {
		return nil, domain.ErrRequestAlreadyHandled
	}
	if _, ok := domain.CanTransition(req.Status, "reject", role); !ok {
		return nil, domain.ErrWrongApprover
	}
	if reason == "" {
		return nil, domain.NewValidationError(map[string]string{"reason": "required"})
	}

	err = s.tx.RunInTx(ctx, func(tx repository.Querier) error {
		if err := s.requests.UpdateStatus(ctx, tx, tenantID, requestID, domain.StatusRejected,
			nil, nil, &reason, nil); err != nil {
			return err
		}
		// Release pending reservation
		lt, err := s.types.GetByID(ctx, req.LeaveTypeID)
		if err != nil {
			return err
		}
		if req.Status.CountsAgainstBalance() && lt.IsYillik() {
			if _, err := s.balances.ApplyDelta(ctx, tx, tenantID, req.EmployeeID, lt.ID, req.StartDate.Year(),
				repository.BalanceDelta{Pending: -req.TotalDays}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	_ = s.publisher.Publish(ctx, event.TopicRequestRejected, event.RequestRejected{
		RequestID: requestID, TenantID: tenantID, EmployeeID: req.EmployeeID,
		RejectorID: actorID, Reason: reason, RejectedAt: time.Now().UTC(),
	})
	req.Status = domain.StatusRejected
	req.RejectedReason = &reason
	return req, nil
}

// requiresHR decides whether a request needs a second (HR) approval step.
// Rules: yıllık izin > threshold days, or ücretsiz, or any type marked so.
func (s *ApprovalService) requiresHR(ctx context.Context, req *domain.LeaveRequest) bool {
	lt, err := s.types.GetByID(ctx, req.LeaveTypeID)
	if err != nil {
		return false
	}
	if lt.Category == domain.CategoryUcretsiz {
		return true
	}
	if lt.IsYillik() && int(req.TotalDays) > s.requireHRApprovalMin {
		return true
	}
	return false
}

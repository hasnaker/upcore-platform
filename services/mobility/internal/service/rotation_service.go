// Package service contains mobility business logic on top of repositories.
package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
	"github.com/upcore/mobility/internal/repository"
)

// RotationRepository is the thin subset of the rotation repo the service
// needs. Declared here so tests can swap an in-memory fake in.
type RotationRepository interface {
	Create(ctx context.Context, rot *domain.InternalRotation) (*domain.InternalRotation, error)
	Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.InternalRotation, error)
	ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]domain.InternalRotation, error)
	UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, next domain.RotationStatus, approverID *uuid.UUID) error
	LastRotationCompletedAt(ctx context.Context, tenantID, employeeID uuid.UUID) (*string, error)
	HasOpenRotation(ctx context.Context, tenantID, employeeID uuid.UUID) (bool, error)
	ListPending(ctx context.Context, tenantID uuid.UUID, status domain.RotationStatus) ([]domain.InternalRotation, error)
	List(ctx context.Context, f repository.RotationListFilter) ([]domain.InternalRotation, error)
}

// RotationService orchestrates internal rotation workflows.
type RotationService struct {
	rotations    RotationRepository
	cooldownDays int
	logger       zerolog.Logger
}

// compile-time check: repository.RotationRepo must satisfy RotationRepository.
var _ RotationRepository = (*repository.RotationRepo)(nil)

// NewRotationService wires a RotationService.
func NewRotationService(
	rotations RotationRepository,
	cooldownDays int,
	logger zerolog.Logger,
) *RotationService {
	return &RotationService{rotations: rotations, cooldownDays: cooldownDays, logger: logger}
}

// ProposeInput carries the minimum info to create a rotation proposal.
type ProposeInput struct {
	TenantID       uuid.UUID
	EmployeeID     uuid.UUID
	FromPositionID uuid.UUID
	ToPositionID   uuid.UUID
	FromDeptID     uuid.UUID
	ToDeptID       uuid.UUID
	ReasonTR       string
	StartDate      *time.Time
	EndDate        *time.Time
	RequestedByID  uuid.UUID
}

const minReasonLength = 50

// Propose creates a new rotation in "proposed" state after cooldown and
// duplicate-open checks. Reason must be at least minReasonLength chars.
func (s *RotationService) Propose(ctx context.Context, in ProposeInput) (*domain.InternalRotation, error) {
	if in.EmployeeID == uuid.Nil || in.ToPositionID == uuid.Nil || in.FromPositionID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	if in.FromPositionID == in.ToPositionID && in.FromDeptID == in.ToDeptID {
		return nil, fmt.Errorf("%w: kaynak ve hedef pozisyon aynı olamaz", domain.ErrValidation)
	}
	if len([]rune(strings.TrimSpace(in.ReasonTR))) < minReasonLength {
		return nil, fmt.Errorf("%w: gerekçe en az %d karakter olmalı", domain.ErrValidation, minReasonLength)
	}

	// Block concurrent active/proposed rotations for the same employee.
	open, err := s.rotations.HasOpenRotation(ctx, in.TenantID, in.EmployeeID)
	if err != nil {
		return nil, fmt.Errorf("duplicate-open check: %w", err)
	}
	if open {
		return nil, domain.ErrDuplicateOpenRotation
	}

	if err := s.ensureCooldown(ctx, in.TenantID, in.EmployeeID); err != nil {
		return nil, err
	}

	rot := &domain.InternalRotation{
		TenantID:       in.TenantID,
		EmployeeID:     in.EmployeeID,
		FromPositionID: in.FromPositionID,
		ToPositionID:   in.ToPositionID,
		FromDeptID:     in.FromDeptID,
		ToDeptID:       in.ToDeptID,
		Status:         domain.RotationProposed,
		ReasonTR:       strings.TrimSpace(in.ReasonTR),
		StartDate:      in.StartDate,
		EndDate:        in.EndDate,
		RequestedByID:  in.RequestedByID,
	}
	return s.rotations.Create(ctx, rot)
}

// Approve moves a rotation from proposed → approved, validating the transition.
func (s *RotationService) Approve(ctx context.Context, tenantID, id, approverID uuid.UUID) error {
	current, err := s.rotations.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if !domain.AllowedRotationTransition(current.Status, domain.RotationApproved) {
		return fmt.Errorf("%w: %s → approved", domain.ErrInvalidTransition, current.Status)
	}
	return s.rotations.UpdateStatus(ctx, tenantID, id, domain.RotationApproved, &approverID)
}

// Reject moves a rotation from proposed → rejected. Reason is required.
func (s *RotationService) Reject(ctx context.Context, tenantID, id uuid.UUID, reason string) error {
	if len([]rune(strings.TrimSpace(reason))) < 10 {
		return domain.ErrRejectReasonRequired
	}
	current, err := s.rotations.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if !domain.AllowedRotationTransition(current.Status, domain.RotationRejected) {
		return fmt.Errorf("%w: %s → rejected", domain.ErrInvalidTransition, current.Status)
	}
	return s.rotations.UpdateStatus(ctx, tenantID, id, domain.RotationRejected, nil)
}

// Complete moves an active rotation → completed.
func (s *RotationService) Complete(ctx context.Context, tenantID, id uuid.UUID) error {
	current, err := s.rotations.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	// Allow completing from approved (skipping explicit activation) as a
	// convenience for HR closing a rotation that was never marked active.
	if current.Status != domain.RotationActive && current.Status != domain.RotationApproved {
		return fmt.Errorf("%w: %s → completed", domain.ErrInvalidTransition, current.Status)
	}
	return s.rotations.UpdateStatus(ctx, tenantID, id, domain.RotationCompleted, nil)
}

// ListByEmployee returns rotation history for one employee.
func (s *RotationService) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]domain.InternalRotation, error) {
	return s.rotations.ListByEmployee(ctx, tenantID, employeeID)
}

// ListPending returns rotations awaiting approval. Role filters which subset
// the caller sees; at this layer we return the proposed list — scope filtering
// by caller manager/department is handled upstream once the employee service
// exposes manager-of-employee lookups.
func (s *RotationService) ListPending(ctx context.Context, tenantID uuid.UUID) ([]domain.InternalRotation, error) {
	return s.rotations.ListPending(ctx, tenantID, domain.RotationProposed)
}

// List — keyset-paginated list across all statuses (GET /rotations).
func (s *RotationService) List(ctx context.Context, f repository.RotationListFilter) ([]domain.InternalRotation, error) {
	return s.rotations.List(ctx, f)
}

func (s *RotationService) ensureCooldown(ctx context.Context, tenantID, employeeID uuid.UUID) error {
	last, err := s.rotations.LastRotationCompletedAt(ctx, tenantID, employeeID)
	if err != nil {
		return fmt.Errorf("cooldown lookup: %w", err)
	}
	if last == nil || *last == "" {
		return nil // first rotation, no cooldown
	}
	t, err := time.Parse("2006-01-02", (*last)[:10])
	if err != nil {
		s.logger.Warn().Str("raw", *last).Msg("cooldown date parse failed — allowing through")
		return nil
	}
	if time.Since(t) < time.Duration(s.cooldownDays)*24*time.Hour {
		return domain.ErrCooldownActive
	}
	return nil
}

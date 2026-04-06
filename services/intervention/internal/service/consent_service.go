package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/event"
	"github.com/upcore/intervention/internal/repository"
)

// ConsentService manages consent granting, declining, and revocation.
type ConsentService struct {
	consents    repository.ConsentRepository
	assignments repository.AssignmentRepository
	publisher   event.Publisher
	log         zerolog.Logger
}

// NewConsentService constructs a ConsentService.
func NewConsentService(
	consents repository.ConsentRepository,
	assignments repository.AssignmentRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *ConsentService {
	return &ConsentService{
		consents:    consents,
		assignments: assignments,
		publisher:   publisher,
		log:         log.With().Str("component", "consent_service").Logger(),
	}
}

// Grant records that an employee has granted consent for an assignment.
func (s *ConsentService) Grant(ctx context.Context, tenantID, assignmentID, employeeID uuid.UUID, ip string) error {
	a, err := s.assignments.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return err
	}
	if !a.CanConsent() {
		return domain.ErrInvalidStatus
	}
	if a.HasConsent() {
		return domain.ErrAlreadyConsented
	}

	// Log consent
	log := &domain.ConsentLog{
		TenantID:     tenantID,
		AssignmentID: assignmentID,
		EmployeeID:   employeeID,
		Action:       domain.ConsentGranted,
		ActorIP:      ip,
	}
	if err := s.consents.Create(ctx, log); err != nil {
		return fmt.Errorf("create consent log: %w", err)
	}

	// Update assignment
	now := time.Now().UTC()
	a.AcceptedAt = &now
	a.Status = domain.AssignmentStatusInProgress
	if err := s.assignments.Update(ctx, a); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicConsentGranted, map[string]any{
		"assignment_id": assignmentID,
		"tenant_id":     tenantID,
		"employee_id":   employeeID,
		"granted_at":    now,
	})

	s.log.Info().
		Str("assignment_id", assignmentID.String()).
		Msg("consent granted")
	return nil
}

// Decline records that an employee has declined an assignment.
func (s *ConsentService) Decline(ctx context.Context, tenantID, assignmentID, employeeID uuid.UUID, reason, ip string) error {
	a, err := s.assignments.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return err
	}
	if !a.CanDecline() {
		return domain.ErrInvalidStatus
	}

	log := &domain.ConsentLog{
		TenantID:     tenantID,
		AssignmentID: assignmentID,
		EmployeeID:   employeeID,
		Action:       domain.ConsentDeclined,
		Reason:       &reason,
		ActorIP:      ip,
	}
	if err := s.consents.Create(ctx, log); err != nil {
		return fmt.Errorf("create consent log: %w", err)
	}

	a.Status = domain.AssignmentStatusDeclined
	if err := s.assignments.Update(ctx, a); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicConsentDeclined, map[string]any{
		"assignment_id": assignmentID,
		"tenant_id":     tenantID,
		"employee_id":   employeeID,
	})

	s.log.Info().
		Str("assignment_id", assignmentID.String()).
		Msg("consent declined")
	return nil
}

// Revoke records that consent has been revoked (cancels the assignment).
func (s *ConsentService) Revoke(ctx context.Context, tenantID, assignmentID, employeeID uuid.UUID, reason, ip string) error {
	log := &domain.ConsentLog{
		TenantID:     tenantID,
		AssignmentID: assignmentID,
		EmployeeID:   employeeID,
		Action:       domain.ConsentRevoked,
		Reason:       &reason,
		ActorIP:      ip,
	}
	if err := s.consents.Create(ctx, log); err != nil {
		return fmt.Errorf("create consent log: %w", err)
	}

	return s.assignments.Cancel(ctx, tenantID, assignmentID, "consent revoked: "+reason)
}

// GetHistory returns consent history for an employee.
func (s *ConsentService) GetHistory(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ConsentLog, error) {
	return s.consents.ListByEmployee(ctx, tenantID, employeeID)
}

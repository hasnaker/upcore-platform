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
	catalog     repository.CatalogRepository
	publisher   event.Publisher
	log         zerolog.Logger
}

// NewConsentService constructs a ConsentService.
func NewConsentService(
	consents repository.ConsentRepository,
	assignments repository.AssignmentRepository,
	catalog repository.CatalogRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *ConsentService {
	return &ConsentService{
		consents:    consents,
		assignments: assignments,
		catalog:     catalog,
		publisher:   publisher,
		log:         log.With().Str("component", "consent_service").Logger(),
	}
}

// ActorContext captures who triggered the consent action and from where.
type ActorContext struct {
	EmployeeID uuid.UUID
	IP         string
	UserAgent  string
}

// Grant records that an employee has granted consent for an assignment.
func (s *ConsentService) Grant(ctx context.Context, tenantID, assignmentID uuid.UUID, actor ActorContext) error {
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
	logRow := &domain.ConsentLog{
		TenantID:     tenantID,
		AssignmentID: assignmentID,
		EmployeeID:   actor.EmployeeID,
		Action:       domain.ConsentGranted,
		ActorIP:      actor.IP,
		UserAgent:    actor.UserAgent,
	}
	if err := s.consents.Create(ctx, logRow); err != nil {
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
		"employee_id":   actor.EmployeeID,
		"granted_at":    now,
	})

	s.log.Info().
		Str("assignment_id", assignmentID.String()).
		Msg("consent granted")
	return nil
}

// Decline records that an employee has declined an assignment.
func (s *ConsentService) Decline(ctx context.Context, tenantID, assignmentID uuid.UUID, reason string, actor ActorContext) error {
	a, err := s.assignments.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return err
	}
	if !a.CanDecline() {
		return domain.ErrInvalidStatus
	}

	var reasonPtr *string
	if reason != "" {
		reasonPtr = &reason
	}

	logRow := &domain.ConsentLog{
		TenantID:     tenantID,
		AssignmentID: assignmentID,
		EmployeeID:   actor.EmployeeID,
		Action:       domain.ConsentDeclined,
		Reason:       reasonPtr,
		ActorIP:      actor.IP,
		UserAgent:    actor.UserAgent,
	}
	if err := s.consents.Create(ctx, logRow); err != nil {
		return fmt.Errorf("create consent log: %w", err)
	}

	a.Status = domain.AssignmentStatusDeclined
	if err := s.assignments.Update(ctx, a); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicConsentDeclined, map[string]any{
		"assignment_id": assignmentID,
		"tenant_id":     tenantID,
		"employee_id":   actor.EmployeeID,
		"reason":        reason,
	})

	s.log.Info().
		Str("assignment_id", assignmentID.String()).
		Msg("consent declined")
	return nil
}

// Revoke records that consent has been revoked (cancels the assignment).
func (s *ConsentService) Revoke(ctx context.Context, tenantID, assignmentID uuid.UUID, reason string, actor ActorContext) error {
	a, err := s.assignments.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return err
	}
	if domain.IsTerminalStatus(a.Status) {
		return domain.ErrAssignmentTerminal
	}

	var reasonPtr *string
	if reason != "" {
		reasonPtr = &reason
	}

	logRow := &domain.ConsentLog{
		TenantID:     tenantID,
		AssignmentID: assignmentID,
		EmployeeID:   actor.EmployeeID,
		Action:       domain.ConsentRevoked,
		Reason:       reasonPtr,
		ActorIP:      actor.IP,
		UserAgent:    actor.UserAgent,
	}
	if err := s.consents.Create(ctx, logRow); err != nil {
		return fmt.Errorf("create consent log: %w", err)
	}

	_ = s.publisher.Publish(ctx, event.TopicConsentDeclined, map[string]any{
		"assignment_id": assignmentID,
		"tenant_id":     tenantID,
		"employee_id":   actor.EmployeeID,
		"reason":        "revoked: " + reason,
	})

	return s.assignments.Cancel(ctx, tenantID, assignmentID, "consent revoked: "+reason)
}

// Remind republishes the intervention.assigned.v1 event so the notification
// service re-sends the consent request email. Only allowed for pending consent
// assignments that have been waiting more than the configured threshold.
func (s *ConsentService) Remind(ctx context.Context, tenantID, assignmentID uuid.UUID, minAge time.Duration) error {
	a, err := s.assignments.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return err
	}
	if !a.CanConsent() {
		return domain.ErrInvalidStatus
	}
	if time.Since(a.AssignedAt) < minAge {
		return domain.ErrInvalidStatus
	}

	interv, err := s.catalog.GetByID(ctx, a.InterventionID)
	if err != nil {
		return err
	}

	return s.publisher.Publish(ctx, event.TopicAssigned, map[string]any{
		"assignment_id":     a.ID,
		"tenant_id":         tenantID,
		"intervention":      interv.Code,
		"intervention_type": interv.TitleTR,
		"description":       interv.DescriptionTR,
		"employee_id":       a.EmployeeID,
		"assigned_at":       a.AssignedAt,
		"reminder":          true,
	})
}

// GetAssignment exposes the assignment lookup used by the handler to enforce
// ownership before recording a consent action.
func (s *ConsentService) GetAssignment(ctx context.Context, tenantID, assignmentID uuid.UUID) (*domain.Assignment, error) {
	return s.assignments.GetByID(ctx, tenantID, assignmentID)
}

// GetHistory returns consent history for an employee.
func (s *ConsentService) GetHistory(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ConsentLog, error) {
	return s.consents.ListByEmployee(ctx, tenantID, employeeID)
}

// ListByAssignment returns consent history for a single assignment (HR drill-down).
func (s *ConsentService) ListByAssignment(ctx context.Context, tenantID, assignmentID uuid.UUID) ([]*domain.ConsentLog, error) {
	return s.consents.ListByAssignment(ctx, tenantID, assignmentID)
}

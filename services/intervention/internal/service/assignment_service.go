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

// AssignmentService manages intervention assignment lifecycle.
type AssignmentService struct {
	assignments repository.AssignmentRepository
	catalog     repository.CatalogRepository
	publisher   event.Publisher
	log         zerolog.Logger
}

// NewAssignmentService constructs an AssignmentService.
func NewAssignmentService(
	assignments repository.AssignmentRepository,
	catalog repository.CatalogRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *AssignmentService {
	return &AssignmentService{
		assignments: assignments,
		catalog:     catalog,
		publisher:   publisher,
		log:         log.With().Str("component", "assignment_service").Logger(),
	}
}

// AssignRequest is the input for creating an assignment.
type AssignRequest struct {
	TenantID       uuid.UUID  `json:"tenant_id"`
	InterventionID uuid.UUID  `json:"intervention_id"`
	EmployeeID     uuid.UUID  `json:"employee_id"`
	AssignedBy     *uuid.UUID `json:"assigned_by,omitempty"`
	ScheduledStart *time.Time `json:"scheduled_start,omitempty"`
	ScheduledEnd   *time.Time `json:"scheduled_end,omitempty"`
	Priority       string     `json:"priority,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	TriggerSource  string     `json:"trigger_source,omitempty"`
	TriggerRefID   *uuid.UUID `json:"trigger_ref_id,omitempty"`
}

// Assign creates a new individual assignment.
func (s *AssignmentService) Assign(ctx context.Context, req AssignRequest) (*domain.Assignment, error) {
	// Validate intervention exists and is active
	interv, err := s.catalog.GetByID(ctx, req.InterventionID)
	if err != nil {
		return nil, err
	}
	if !interv.Active {
		return nil, domain.ErrInterventionNotFound
	}

	a := &domain.Assignment{
		TenantID:       req.TenantID,
		InterventionID: req.InterventionID,
		EmployeeID:     req.EmployeeID,
		AssignedBy:     req.AssignedBy,
		StartsAt:       req.ScheduledStart,
		EndsAt:         req.ScheduledEnd,
		Status:         domain.AssignmentStatusAssigned,
		Notes:          req.Notes,
	}

	if err := a.Validate(); err != nil {
		return nil, err
	}

	if err := s.assignments.Create(ctx, a); err != nil {
		return nil, fmt.Errorf("create assignment: %w", err)
	}

	_ = s.publisher.Publish(ctx, event.TopicAssigned, map[string]any{
		"assignment_id": a.ID,
		"tenant_id":     a.TenantID,
		"intervention":  interv.Code,
		"employee_id":   a.EmployeeID,
		"assigned_at":   a.AssignedAt,
	})

	s.log.Info().
		Str("assignment_id", a.ID.String()).
		Str("intervention", interv.Code).
		Msg("intervention assigned")
	return a, nil
}

// Start transitions an assignment to in_progress.
func (s *AssignmentService) Start(ctx context.Context, tenantID, id uuid.UUID) error {
	a, err := s.assignments.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if !a.CanStart() {
		if !a.HasConsent() {
			return domain.ErrConsentRequired
		}
		return domain.ErrInvalidStatus
	}
	a.Status = domain.AssignmentStatusInProgress
	now := time.Now().UTC()
	a.StartsAt = &now
	if err := s.assignments.Update(ctx, a); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicStarted, map[string]any{
		"assignment_id": id,
		"tenant_id":     tenantID,
		"started_at":    now,
	})
	return nil
}

// Complete transitions an assignment to completed.
func (s *AssignmentService) Complete(ctx context.Context, tenantID, id uuid.UUID) error {
	a, err := s.assignments.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if !a.CanComplete() {
		return domain.ErrInvalidStatus
	}
	a.Status = domain.AssignmentStatusCompleted
	now := time.Now().UTC()
	a.CompletedAt = &now
	if err := s.assignments.Update(ctx, a); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicCompleted, map[string]any{
		"assignment_id": id,
		"tenant_id":     tenantID,
		"employee_id":   a.EmployeeID,
		"completed_at":  now,
	})
	return nil
}

// Decline records an employee declining an assignment.
func (s *AssignmentService) Decline(ctx context.Context, tenantID, id uuid.UUID) error {
	a, err := s.assignments.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if !a.CanDecline() {
		return domain.ErrInvalidStatus
	}
	a.Status = domain.AssignmentStatusDeclined
	return s.assignments.Update(ctx, a)
}

// Cancel cancels an assignment with a reason.
func (s *AssignmentService) Cancel(ctx context.Context, tenantID, id uuid.UUID, reason string) error {
	return s.assignments.Cancel(ctx, tenantID, id, reason)
}

// Get retrieves an assignment by ID.
func (s *AssignmentService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Assignment, error) {
	return s.assignments.GetByID(ctx, tenantID, id)
}

// List returns assignments filtered by criteria.
func (s *AssignmentService) List(ctx context.Context, f domain.AssignmentFilter) ([]*domain.Assignment, int, error) {
	return s.assignments.List(ctx, f)
}

// ListForEmployee returns assignments for a specific employee.
func (s *AssignmentService) ListForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Assignment, error) {
	return s.assignments.ListByEmployee(ctx, tenantID, employeeID)
}

// ListPendingConsent returns assignments pending consent for an employee.
func (s *AssignmentService) ListPendingConsent(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Assignment, error) {
	return s.assignments.ListPendingConsent(ctx, tenantID, employeeID)
}

// BulkAssignRequest is the input for bulk assignment.
type BulkAssignRequest struct {
	TenantID       uuid.UUID   `json:"tenant_id"`
	InterventionID uuid.UUID   `json:"intervention_id"`
	EmployeeIDs    []uuid.UUID `json:"employee_ids"`
	AssignedBy     *uuid.UUID  `json:"assigned_by,omitempty"`
	Priority       string      `json:"priority,omitempty"`
	Notes          *string     `json:"notes,omitempty"`
}

// BulkAssign creates assignments for multiple employees.
func (s *AssignmentService) BulkAssign(ctx context.Context, req BulkAssignRequest) (int, error) {
	assignments := make([]*domain.Assignment, len(req.EmployeeIDs))
	for i, empID := range req.EmployeeIDs {
		assignments[i] = &domain.Assignment{
			TenantID:       req.TenantID,
			InterventionID: req.InterventionID,
			EmployeeID:     empID,
			AssignedBy:     req.AssignedBy,
			Status:         domain.AssignmentStatusAssigned,
			Notes:          req.Notes,
		}
	}
	return s.assignments.BulkCreate(ctx, assignments)
}

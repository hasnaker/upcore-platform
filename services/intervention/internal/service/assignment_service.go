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

	payload := map[string]any{
		"assignment_id":     a.ID,
		"tenant_id":         a.TenantID,
		"intervention":      interv.Code,
		"intervention_type": interv.TitleTR,
		"description":       interv.DescriptionTR,
		"evidence_tier":     string(interv.EvidenceTier),
		"employee_id":       a.EmployeeID,
		"assigned_at":       a.AssignedAt,
	}
	if interv.ExpectedEffectSize != nil {
		payload["expected_effect_size"] = fmt.Sprintf("%.2f", *interv.ExpectedEffectSize)
	}
	if interv.DurationWeeks != nil {
		payload["duration_weeks"] = *interv.DurationWeeks
	}
	if interv.TimeToEffectWeeks != nil {
		payload["time_to_effect_weeks"] = *interv.TimeToEffectWeeks
	}
	_ = s.publisher.Publish(ctx, event.TopicAssigned, payload)

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

// RetractFromPrediction cancels every non-terminal intervention assignment
// that was derived from a retracted ML prediction. Called from the event
// subscriber when ml.prediction.retracted.v1 arrives (KVKK Madde 22 upheld
// objection). Each cancelled assignment emits an intervention.cancelled.v1
// event so downstream reminders, notifications and analytics can react.
//
// The derivation link is stored in assignment.metadata (JSONB) as
// {"source_prediction_id": "<uuid>", "source_objection_id": "<uuid>"}.
// Older rows written before migration 064 may not have metadata; those are
// simply skipped (logged as info).
//
// Satisfies event.PredictionRetractionHandler.
func (s *AssignmentService) RetractFromPrediction(
	ctx context.Context,
	tenantID, predictionID, objectionID, retractedBy uuid.UUID,
	reason string,
) error {
	if tenantID == uuid.Nil || predictionID == uuid.Nil {
		return fmt.Errorf("retract_from_prediction: tenant_id and prediction_id required")
	}
	if reason == "" {
		reason = "KVKK m.22 — kullanıcı itirazı üzerine tahmin geri alındı"
	}

	assignments, err := s.assignments.ListBySourcePrediction(ctx, tenantID, predictionID)
	if err != nil {
		return fmt.Errorf("list by source prediction: %w", err)
	}
	s.log.Info().
		Str("tenant_id", tenantID.String()).
		Str("prediction_id", predictionID.String()).
		Int("derived_assignments", len(assignments)).
		Msg("ml prediction retracted: cancelling derived assignments")

	cancelled := 0
	for _, a := range assignments {
		if !a.CanCancel() {
			continue
		}
		if err := s.assignments.Cancel(ctx, tenantID, a.ID, reason); err != nil {
			s.log.Error().Err(err).
				Str("assignment_id", a.ID.String()).
				Msg("cancel derived assignment failed")
			continue
		}
		cancelled++
		_ = s.publisher.Publish(ctx, event.TopicCancelled, map[string]any{
			"assignment_id":      a.ID,
			"tenant_id":          tenantID,
			"employee_id":        a.EmployeeID,
			"reason":             reason,
			"source_prediction":  predictionID,
			"source_objection":   objectionID,
			"cancelled_by":       retractedBy,
			"kvkk_madde22":       true,
		})
	}

	s.log.Info().
		Str("tenant_id", tenantID.String()).
		Str("prediction_id", predictionID.String()).
		Int("cancelled", cancelled).
		Int("scanned", len(assignments)).
		Msg("derived assignments retracted")
	return nil
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

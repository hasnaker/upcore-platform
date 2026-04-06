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

// OutcomeService manages intervention outcome recording and analysis.
type OutcomeService struct {
	outcomes    repository.OutcomeRepository
	assignments repository.AssignmentRepository
	publisher   event.Publisher
	log         zerolog.Logger
}

// NewOutcomeService constructs an OutcomeService.
func NewOutcomeService(
	outcomes repository.OutcomeRepository,
	assignments repository.AssignmentRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *OutcomeService {
	return &OutcomeService{
		outcomes:    outcomes,
		assignments: assignments,
		publisher:   publisher,
		log:         log.With().Str("component", "outcome_service").Logger(),
	}
}

// RecordOutcomeRequest is the input for recording an outcome.
type RecordOutcomeRequest struct {
	TenantID          uuid.UUID  `json:"tenant_id"`
	AssignmentID      uuid.UUID  `json:"assignment_id"`
	PreBATScore       *float64   `json:"pre_bat_score,omitempty"`
	PostBATScore      *float64   `json:"post_bat_score,omitempty"`
	PreAssessmentID   *uuid.UUID `json:"pre_assessment_id,omitempty"`
	PostAssessmentID  *uuid.UUID `json:"post_assessment_id,omitempty"`
	SelfReportedRating *int      `json:"self_reported_rating,omitempty"`
	Notes             *string    `json:"notes,omitempty"`
	SuccessThreshold  float64    `json:"-"` // injected from config
}

// RecordOutcome creates or updates an outcome for an assignment.
func (s *OutcomeService) RecordOutcome(ctx context.Context, req RecordOutcomeRequest) (*domain.Outcome, error) {
	a, err := s.assignments.GetByID(ctx, req.TenantID, req.AssignmentID)
	if err != nil {
		return nil, err
	}

	outcome := &domain.Outcome{
		TenantID:         req.TenantID,
		AssignmentID:     req.AssignmentID,
		InterventionID:   a.InterventionID,
		EmployeeID:       a.EmployeeID,
		PreBATScore:      req.PreBATScore,
		PostBATScore:     req.PostBATScore,
		PreAssessmentID:  req.PreAssessmentID,
		PostAssessmentID: req.PostAssessmentID,
		MeasuredAt:       time.Now().UTC(),
		Notes:            req.Notes,
	}

	if err := outcome.Validate(); err != nil {
		return nil, err
	}

	// Compute effect size if both scores present
	if req.PreBATScore != nil && req.PostBATScore != nil {
		effect := domain.ComputeEffect(*req.PreBATScore, *req.PostBATScore)
		outcome.EffectSize = &effect
		success := domain.IsSuccess(*req.PreBATScore, *req.PostBATScore, req.SuccessThreshold)
		outcome.Success = &success
	}

	if err := s.outcomes.Upsert(ctx, outcome); err != nil {
		return nil, fmt.Errorf("upsert outcome: %w", err)
	}

	// Publish outcome event
	payload := map[string]any{
		"assignment_id": req.AssignmentID,
		"tenant_id":     req.TenantID,
	}
	if outcome.EffectSize != nil {
		payload["effect_size"] = *outcome.EffectSize
	}
	if outcome.Success != nil {
		payload["success"] = *outcome.Success
	}
	_ = s.publisher.Publish(ctx, event.TopicOutcomeRecorded, payload)

	s.log.Info().
		Str("assignment_id", req.AssignmentID.String()).
		Msg("outcome recorded")
	return outcome, nil
}

// GetByAssignment retrieves the outcome for an assignment.
func (s *OutcomeService) GetByAssignment(ctx context.Context, assignmentID uuid.UUID) (*domain.Outcome, error) {
	return s.outcomes.GetByAssignment(ctx, assignmentID)
}

// LinkPreAssessment links a pre-assessment session to an assignment outcome.
func (s *OutcomeService) LinkPreAssessment(ctx context.Context, tenantID, assignmentID, sessionID uuid.UUID) error {
	a, err := s.assignments.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return err
	}
	outcome, err := s.outcomes.GetByAssignment(ctx, assignmentID)
	if err != nil {
		// Create a new outcome with just the pre-assessment link
		outcome = &domain.Outcome{
			TenantID:        tenantID,
			AssignmentID:    assignmentID,
			InterventionID:  a.InterventionID,
			EmployeeID:      a.EmployeeID,
			PreAssessmentID: &sessionID,
			MeasuredAt:      time.Now().UTC(),
		}
		return s.outcomes.Upsert(ctx, outcome)
	}
	outcome.PreAssessmentID = &sessionID
	return s.outcomes.Upsert(ctx, outcome)
}

// LinkPostAssessment links a post-assessment session to an assignment outcome.
func (s *OutcomeService) LinkPostAssessment(ctx context.Context, tenantID, assignmentID, sessionID uuid.UUID) error {
	a, err := s.assignments.GetByID(ctx, tenantID, assignmentID)
	if err != nil {
		return err
	}
	outcome, err := s.outcomes.GetByAssignment(ctx, assignmentID)
	if err != nil {
		outcome = &domain.Outcome{
			TenantID:         tenantID,
			AssignmentID:     assignmentID,
			InterventionID:   a.InterventionID,
			EmployeeID:       a.EmployeeID,
			PostAssessmentID: &sessionID,
			MeasuredAt:       time.Now().UTC(),
		}
		return s.outcomes.Upsert(ctx, outcome)
	}
	outcome.PostAssessmentID = &sessionID
	return s.outcomes.Upsert(ctx, outcome)
}

package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
)

// AutoAssigner handles rule-driven auto-assignment from events.
type AutoAssigner struct {
	recommender *RecommenderService
	assignments *AssignmentService
	log         zerolog.Logger
}

// NewAutoAssigner constructs an AutoAssigner.
func NewAutoAssigner(
	recommender *RecommenderService,
	assignments *AssignmentService,
	log zerolog.Logger,
) *AutoAssigner {
	return &AutoAssigner{
		recommender: recommender,
		assignments: assignments,
		log:         log.With().Str("component", "auto_assigner").Logger(),
	}
}

// BurnoutAlert is the payload from survey.burnout.risk.elevated.v1.
type BurnoutAlert struct {
	TenantID    uuid.UUID `json:"tenant_id"`
	SegmentType string    `json:"segment_type"`
	SegmentKey  string    `json:"segment_key"`
	MeanBurnout float64   `json:"mean_burnout"`
	DeltaVsPrev float64   `json:"delta_vs_prev"`
	N           int       `json:"n"`
}

// HandleBurnoutAlert uses the recommender to pick the top intervention
// and creates a high-priority assignment with consent required.
func (a *AutoAssigner) HandleBurnoutAlert(ctx context.Context, alert BurnoutAlert) error {
	a.log.Info().
		Str("tenant_id", alert.TenantID.String()).
		Str("segment", alert.SegmentKey).
		Float64("mean_burnout", alert.MeanBurnout).
		Msg("processing burnout alert")

	// Get recommendation
	recs, err := a.recommender.Recommend(ctx, RecommendRequest{
		TenantID:  alert.TenantID,
		Dimension: "burnout",
		TopK:      1,
	})
	if err != nil {
		return fmt.Errorf("recommend for burnout: %w", err)
	}
	if len(recs) == 0 {
		a.log.Warn().Msg("no intervention recommendations available")
		return nil
	}

	topRec := recs[0]

	// TODO: resolve employees in the alert segment (department/position_level/tenure_bucket)
	// via employee-service API. For now, log the recommendation.
	a.log.Info().
		Str("recommended_intervention", topRec.Code).
		Float64("score", topRec.Score).
		Str("segment_type", alert.SegmentType).
		Str("segment_key", alert.SegmentKey).
		Msg("auto-assign: recommended intervention for burnout segment")

	// When employee resolution is available, create assignments:
	// for _, empID := range segmentEmployees {
	//     a.assignments.Assign(ctx, AssignRequest{
	//         TenantID:       alert.TenantID,
	//         InterventionID: topRec.InterventionID,
	//         EmployeeID:     empID,
	//         Priority:       "high",
	//         TriggerSource:  "auto_burnout_alert",
	//     })
	// }

	return nil
}

// SurveyAggregateEvent is the payload from survey.aggregates.computed.v1.
type SurveyAggregateEvent struct {
	DistributionID    uuid.UUID `json:"distribution_id"`
	TenantID          uuid.UUID `json:"tenant_id"`
	SegmentsCount     int       `json:"segments_count"`
	LowNSegmentsCount int       `json:"low_n_segments_count"`
}

// HandleSurveyDelta detects significant deltas and creates intervention assignments.
func (a *AutoAssigner) HandleSurveyDelta(ctx context.Context, evt SurveyAggregateEvent) error {
	a.log.Info().
		Str("distribution_id", evt.DistributionID.String()).
		Int("segments", evt.SegmentsCount).
		Msg("processing survey delta event")
	// TODO: compare current aggregates vs previous, detect significant deterioration,
	// and auto-assign interventions for affected segments.
	return nil
}

// AssessmentCompletedEvent is the payload from assessment.completed.v1.
type AssessmentCompletedEvent struct {
	SessionID  uuid.UUID `json:"session_id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	EmployeeID uuid.UUID `json:"employee_id"`
}

// HandleAssessmentCompleted links assessment results to assignment outcomes.
func (a *AutoAssigner) HandleAssessmentCompleted(ctx context.Context, evt AssessmentCompletedEvent) error {
	a.log.Info().
		Str("session_id", evt.SessionID.String()).
		Str("employee_id", evt.EmployeeID.String()).
		Msg("processing assessment completed event")

	// TODO: find active assignments for this employee,
	// determine if this is a pre or post assessment,
	// and link it to the outcome.

	// Lookup: assignments where employee_id matches and status is in_progress
	assignments, err := a.assignments.ListForEmployee(ctx, evt.TenantID, evt.EmployeeID)
	if err != nil {
		return fmt.Errorf("list assignments for employee: %w", err)
	}

	for _, assign := range assignments {
		if assign.Status != domain.AssignmentStatusInProgress {
			continue
		}
		// This is a simplified heuristic. In production, we'd check assessment type
		// and timing to determine if it's pre or post.
		a.log.Info().
			Str("assignment_id", assign.ID.String()).
			Msg("potential assignment for assessment linking")
	}

	return nil
}

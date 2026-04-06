package event

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/rs/zerolog"
)

// Subscriber listens for events from other services.
type Subscriber struct {
	log zerolog.Logger
}

// NewSubscriber creates a new event subscriber.
func NewSubscriber(log zerolog.Logger) *Subscriber {
	return &Subscriber{log: log.With().Str("component", "event_subscriber").Logger()}
}

// HandleBurnoutRiskElevated processes survey.burnout.risk.elevated.v1 events.
func (s *Subscriber) HandleBurnoutRiskElevated(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		TenantID    string  `json:"tenant_id"`
		SegmentType string  `json:"segment_type"`
		SegmentKey  string  `json:"segment_key"`
		MeanBurnout float64 `json:"mean_burnout"`
		DeltaVsPrev float64 `json:"delta_vs_prev"`
		N           int     `json:"n"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal burnout alert: %w", err)
	}
	s.log.Info().
		Str("tenant_id", payload.TenantID).
		Str("segment", payload.SegmentKey).
		Float64("mean_burnout", payload.MeanBurnout).
		Msg("burnout risk elevated: triggering auto-assignment")
	// TODO: delegate to auto_assigner.HandleBurnoutAlert
	return nil
}

// HandleSurveyAggregatesComputed processes survey.aggregates.computed.v1 events.
func (s *Subscriber) HandleSurveyAggregatesComputed(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		DistributionID string `json:"distribution_id"`
		TenantID       string `json:"tenant_id"`
		SegmentsCount  int    `json:"segments_count"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal aggregates computed: %w", err)
	}
	s.log.Info().
		Str("distribution_id", payload.DistributionID).
		Int("segments", payload.SegmentsCount).
		Msg("survey aggregates computed: checking for intervention deltas")
	return nil
}

// HandleAssessmentCompleted processes assessment.completed.v1 events.
func (s *Subscriber) HandleAssessmentCompleted(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		SessionID  string `json:"session_id"`
		TenantID   string `json:"tenant_id"`
		EmployeeID string `json:"employee_id"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal assessment completed: %w", err)
	}
	s.log.Info().
		Str("session_id", payload.SessionID).
		Str("employee_id", payload.EmployeeID).
		Msg("assessment completed: linking to assignment outcomes")
	return nil
}

// HandleEmployeeTerminated processes employee.terminated.v1 events.
func (s *Subscriber) HandleEmployeeTerminated(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		EmployeeID string `json:"employee_id"`
		TenantID   string `json:"tenant_id"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal employee terminated: %w", err)
	}
	s.log.Info().
		Str("employee_id", payload.EmployeeID).
		Msg("employee terminated: cancelling pending assignments")
	// TODO: cancel all pending/in_progress assignments for this employee
	return nil
}

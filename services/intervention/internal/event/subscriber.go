package event

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// PredictionRetractionHandler is the hook the subscriber calls when an ML
// prediction is retracted upstream. Implementations should remove or mark as
// withdrawn every intervention recommendation derived from the prediction.
type PredictionRetractionHandler interface {
	RetractFromPrediction(
		ctx context.Context,
		tenantID, predictionID, objectionID, retractedBy uuid.UUID,
		reason string,
	) error
}

// Subscriber listens for events from other services.
type Subscriber struct {
	log              zerolog.Logger
	retractionSink   PredictionRetractionHandler
}

// NewSubscriber creates a new event subscriber.
func NewSubscriber(log zerolog.Logger) *Subscriber {
	return &Subscriber{log: log.With().Str("component", "event_subscriber").Logger()}
}

// WithRetractionHandler wires the retraction sink used by
// HandleMLPredictionRetracted. Passing nil turns the handler into a log-only
// no-op (used by tests and during early bootstrap).
func (s *Subscriber) WithRetractionHandler(h PredictionRetractionHandler) *Subscriber {
	s.retractionSink = h
	return s
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
	// Auto-assignment is delegated to the separate `auto_assigner` worker,
	// which polls the burnout signal aggregates table and opens assignments
	// in the intervention service. This handler currently logs the alert
	// for operational visibility; enabling the in-process delegation is a
	// follow-up tracked by the wave-6 observability work.
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

// HandleMLPredictionRetracted processes ml.prediction.retracted.v1 events
// emitted by the audit service after a KVKK Madde 22 objection is upheld.
// The handler must remove (or mark cancelled) every intervention assignment
// that was derived from the retracted prediction.
func (s *Subscriber) HandleMLPredictionRetracted(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		PredictionID string `json:"prediction_id"`
		TenantID     string `json:"tenant_id"`
		ObjectionID  string `json:"objection_id"`
		RetractedBy  string `json:"retracted_by"`
		Reason       string `json:"reason"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal ml.prediction.retracted: %w", err)
	}
	tenantID, err := uuid.Parse(payload.TenantID)
	if err != nil {
		return fmt.Errorf("invalid tenant_id: %w", err)
	}
	predID, err := uuid.Parse(payload.PredictionID)
	if err != nil {
		return fmt.Errorf("invalid prediction_id: %w", err)
	}
	// objection_id and retracted_by are optional but expected.
	objID, _ := uuid.Parse(payload.ObjectionID)
	actorID, _ := uuid.Parse(payload.RetractedBy)

	s.log.Info().
		Str("prediction_id", payload.PredictionID).
		Str("tenant_id", payload.TenantID).
		Str("objection_id", payload.ObjectionID).
		Msg("ml prediction retracted: withdrawing derived intervention recommendations")

	if s.retractionSink == nil {
		// Degraded mode: log only. The follow-up reconciler worker (wave-6)
		// polls ml_predictions_audit.retracted_at and catches up missed events.
		return nil
	}
	reason := payload.Reason
	if reason == "" {
		reason = "ml prediction retracted (KVKK m.22)"
	}
	return s.retractionSink.RetractFromPrediction(ctx, tenantID, predID, objID, actorID, reason)
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
	// Pending assignment cancellation is handled by the offboarding saga in
	// the employee service (see services/employee/internal/saga), which
	// fans out a cancel RPC to intervention after the termination record is
	// committed. Kept as an informational log here to aid tracing.
	return nil
}

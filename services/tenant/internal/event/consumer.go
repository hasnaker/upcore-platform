package event

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// EmployeeCreatedPayload reflects the employee.created.v1 event payload.
type EmployeeCreatedPayload struct {
	TenantID   uuid.UUID `json:"tenant_id"`
	EmployeeID uuid.UUID `json:"employee_id"`
}

// EmployeeDeletedPayload reflects the employee.deleted.v1 event payload.
type EmployeeDeletedPayload struct {
	TenantID   uuid.UUID `json:"tenant_id"`
	EmployeeID uuid.UUID `json:"employee_id"`
}

// AssessmentCompletedPayload reflects the assessment.completed.v1 event payload.
type AssessmentCompletedPayload struct {
	TenantID     uuid.UUID `json:"tenant_id"`
	AssessmentID uuid.UUID `json:"assessment_id"`
}

// UsageRecorder abstracts the usage service surface used by the consumer.
type UsageRecorder interface {
	IncrementEmployees(ctx context.Context, tenantID uuid.UUID, delta int64) error
	IncrementAssessments(ctx context.Context, tenantID uuid.UUID, delta int64) error
}

// Consumer dispatches envelopes to handlers.
type Consumer struct {
	usage UsageRecorder
	log   zerolog.Logger
}

// NewConsumer creates a new consumer bound to a usage recorder.
func NewConsumer(u UsageRecorder, log zerolog.Logger) *Consumer {
	return &Consumer{usage: u, log: log}
}

// Handle routes an envelope to the appropriate handler.
func (c *Consumer) Handle(ctx context.Context, env Envelope) error {
	switch env.EventType {
	case "employee.created.v1":
		var p EmployeeCreatedPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			return fmt.Errorf("unmarshal employee.created: %w", err)
		}
		return c.usage.IncrementEmployees(ctx, p.TenantID, 1)
	case "employee.deleted.v1":
		var p EmployeeDeletedPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			return fmt.Errorf("unmarshal employee.deleted: %w", err)
		}
		return c.usage.IncrementEmployees(ctx, p.TenantID, -1)
	case "assessment.completed.v1":
		var p AssessmentCompletedPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			return fmt.Errorf("unmarshal assessment.completed: %w", err)
		}
		return c.usage.IncrementAssessments(ctx, p.TenantID, 1)
	default:
		c.log.Debug().Str("event_type", env.EventType).Msg("consumer: unhandled event type")
		return nil
	}
}

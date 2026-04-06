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

// HandleEmployeeCreated processes employee.created.v1 events.
// Auto-enrolls new employees in active schedules.
func (s *Subscriber) HandleEmployeeCreated(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		EmployeeID   string `json:"employee_id"`
		TenantID     string `json:"tenant_id"`
		DepartmentID string `json:"department_id,omitempty"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal employee.created: %w", err)
	}
	s.log.Info().
		Str("employee_id", payload.EmployeeID).
		Str("tenant_id", payload.TenantID).
		Msg("employee created: check for active schedule enrollment")
	// TODO: query active schedules, check audience filter, create invitation if matched
	return nil
}

// HandleEmployeeTerminated processes employee.terminated.v1 events.
// Excludes terminated employees from future distributions.
func (s *Subscriber) HandleEmployeeTerminated(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		EmployeeID string `json:"employee_id"`
		TenantID   string `json:"tenant_id"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal employee.terminated: %w", err)
	}
	s.log.Info().
		Str("employee_id", payload.EmployeeID).
		Str("tenant_id", payload.TenantID).
		Msg("employee terminated: excluding from future distributions")
	// TODO: cancel pending invitations for this employee
	return nil
}

// HandleDepartmentCreated processes organization.department.created.v1 events.
func (s *Subscriber) HandleDepartmentCreated(ctx context.Context, raw json.RawMessage) error {
	var payload struct {
		DepartmentID string `json:"department_id"`
		TenantID     string `json:"tenant_id"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("unmarshal department.created: %w", err)
	}
	s.log.Info().
		Str("department_id", payload.DepartmentID).
		Msg("new department available for audience filters")
	return nil
}

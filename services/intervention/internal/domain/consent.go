package domain

import (
	"time"

	"github.com/google/uuid"
)

// ConsentAction is the action taken on an intervention assignment consent.
type ConsentAction string

const (
	ConsentGranted ConsentAction = "granted"
	ConsentDeclined ConsentAction = "declined"
	ConsentRevoked  ConsentAction = "revoked"
)

// IsValidConsentAction returns true if a is a known consent action.
func IsValidConsentAction(a ConsentAction) bool {
	switch a {
	case ConsentGranted, ConsentDeclined, ConsentRevoked:
		return true
	}
	return false
}

// ConsentLog mirrors app.intervention_consent_log. This table is append-only.
type ConsentLog struct {
	ID           uuid.UUID     `db:"id" json:"id"`
	TenantID     uuid.UUID     `db:"tenant_id" json:"tenant_id"`
	AssignmentID uuid.UUID     `db:"assignment_id" json:"assignment_id"`
	EmployeeID   uuid.UUID     `db:"employee_id" json:"employee_id"`
	Action       ConsentAction `db:"action" json:"action"`
	Reason       *string       `db:"reason" json:"reason,omitempty"`
	ActorIP      string        `db:"actor_ip" json:"actor_ip"`
	UserAgent    string        `db:"user_agent" json:"user_agent"`
	CreatedAt    time.Time     `db:"created_at" json:"created_at"`
}

// Validate checks required fields and enum values.
func (c *ConsentLog) Validate() error {
	fields := map[string]string{}
	if c.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if c.AssignmentID == uuid.Nil {
		fields["assignment_id"] = "required"
	}
	if c.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if !IsValidConsentAction(c.Action) {
		fields["action"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

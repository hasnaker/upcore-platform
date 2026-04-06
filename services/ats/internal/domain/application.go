package domain

import (
	"database/sql/driver"
	"math"
	"time"

	"github.com/google/uuid"
)

// Stage enumerates pipeline stages for an application.
type Stage string

const (
	StageApplied      Stage = "applied"
	StageScreened     Stage = "screened"
	StageAssessed     Stage = "assessed"
	StageInterviewed  Stage = "interviewed"
	StageOffered      Stage = "offered"
	StageHired        Stage = "hired"
	StageRejected     Stage = "rejected"
	StageWithdrawn    Stage = "withdrawn"
)

// IsValid reports whether the stage is a known value.
func (s Stage) IsValid() bool {
	switch s {
	case StageApplied, StageScreened, StageAssessed, StageInterviewed,
		StageOffered, StageHired, StageRejected, StageWithdrawn:
		return true
	}
	return false
}

// String satisfies fmt.Stringer.
func (s Stage) String() string { return string(s) }

// IsTerminal reports whether this stage is an end state.
func (s Stage) IsTerminal() bool {
	return s == StageHired || s == StageRejected || s == StageWithdrawn
}

// Application represents a candidate's application to a requisition.
type Application struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	CandidateID     uuid.UUID  `db:"candidate_id" json:"candidate_id"`
	RequisitionID   uuid.UUID  `db:"requisition_id" json:"requisition_id"`
	CurrentStage    Stage      `db:"current_stage" json:"current_stage"`
	StageEnteredAt  time.Time  `db:"stage_entered_at" json:"stage_entered_at"`
	Score           *float64   `db:"score" json:"score,omitempty"`
	RejectionReason *string    `db:"rejection_reason" json:"rejection_reason,omitempty"`
	AppliedAt       time.Time  `db:"applied_at" json:"applied_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
}

// Validate checks required fields.
func (a *Application) Validate() error {
	fields := map[string]string{}
	if a.CandidateID == uuid.Nil {
		fields["candidate_id"] = "required"
	}
	if a.RequisitionID == uuid.Nil {
		fields["requisition_id"] = "required"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// DaysInStage returns the number of days the application has been in its current stage.
func (a *Application) DaysInStage() int {
	d := time.Since(a.StageEnteredAt).Hours() / 24
	return int(math.Max(0, d))
}

// IsTerminal returns true when the application is in a terminal stage.
func (a *Application) IsTerminal() bool {
	return a.CurrentStage.IsTerminal()
}

// ApplicationEvent represents an event in the application's lifecycle.
type ApplicationEvent struct {
	ID            uuid.UUID       `db:"id" json:"id"`
	TenantID      uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	ApplicationID uuid.UUID       `db:"application_id" json:"application_id"`
	EventType     AppEventType    `db:"event_type" json:"event_type"`
	FromStage     *Stage          `db:"from_stage" json:"from_stage,omitempty"`
	ToStage       *Stage          `db:"to_stage" json:"to_stage,omitempty"`
	ActorID       *uuid.UUID      `db:"actor_id" json:"actor_id,omitempty"`
	Payload       JSONB           `db:"payload" json:"payload,omitempty"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
}

// AppEventType enumerates application event types.
type AppEventType string

const (
	EventStageChanged       AppEventType = "stage_changed"
	EventNoteAdded          AppEventType = "note_added"
	EventScoreUpdated       AppEventType = "score_updated"
	EventInterviewScheduled AppEventType = "interview_scheduled"
	EventOfferSent          AppEventType = "offer_sent"
	EventOfferAccepted      AppEventType = "offer_accepted"
	EventOfferDeclined      AppEventType = "offer_declined"
)

// JSONB is a thin wrapper around a JSON byte slice for Postgres jsonb columns.
type JSONB []byte

// Scan implements sql.Scanner.
func (j *JSONB) Scan(src any) error {
	if src == nil {
		*j = JSONB("{}")
		return nil
	}
	switch v := src.(type) {
	case []byte:
		cp := make([]byte, len(v))
		copy(cp, v)
		*j = JSONB(cp)
	case string:
		*j = JSONB([]byte(v))
	default:
		*j = JSONB("{}")
	}
	return nil
}

// Value implements driver.Valuer.
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return []byte(j), nil
}

// MarshalJSON emits the underlying bytes.
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

// UnmarshalJSON captures the raw bytes.
func (j *JSONB) UnmarshalJSON(data []byte) error {
	if len(data) == 0 {
		*j = JSONB("{}")
		return nil
	}
	cp := make([]byte, len(data))
	copy(cp, data)
	*j = JSONB(cp)
	return nil
}

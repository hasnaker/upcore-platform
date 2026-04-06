package domain

import (
	"time"

	"github.com/google/uuid"
)

// AssignmentStatus tracks the lifecycle of an intervention assignment.
//
// Lifecycle:
//
//	assigned (awaiting employee consent)
//	  -> declined  (employee declined / terminal)
//	  -> in_progress (employee consented + started)
//	     -> completed  (employee finished / terminal)
//	     -> cancelled  (terminal)
//	     -> lapsed     (ended_at passed without completion / terminal)
type AssignmentStatus string

const (
	AssignmentStatusAssigned   AssignmentStatus = "assigned"
	AssignmentStatusDeclined   AssignmentStatus = "declined"
	AssignmentStatusInProgress AssignmentStatus = "in_progress"
	AssignmentStatusCompleted  AssignmentStatus = "completed"
	AssignmentStatusCancelled  AssignmentStatus = "cancelled"
	AssignmentStatusLapsed     AssignmentStatus = "lapsed"
)

// IsValidAssignmentStatus returns true if s is a known status.
func IsValidAssignmentStatus(s AssignmentStatus) bool {
	switch s {
	case AssignmentStatusAssigned, AssignmentStatusDeclined, AssignmentStatusInProgress,
		AssignmentStatusCompleted, AssignmentStatusCancelled, AssignmentStatusLapsed:
		return true
	}
	return false
}

// IsTerminalStatus reports whether the assignment can no longer transition.
func IsTerminalStatus(s AssignmentStatus) bool {
	switch s {
	case AssignmentStatusDeclined, AssignmentStatusCompleted,
		AssignmentStatusCancelled, AssignmentStatusLapsed:
		return true
	}
	return false
}

// Assignment mirrors app.intervention_assignments.
type Assignment struct {
	ID                  uuid.UUID        `db:"id" json:"id"`
	TenantID            uuid.UUID        `db:"tenant_id" json:"tenant_id"`
	InterventionID      uuid.UUID        `db:"intervention_id" json:"intervention_id"`
	EmployeeID          uuid.UUID        `db:"employee_id" json:"employee_id"`
	AssignedBy          *uuid.UUID       `db:"assigned_by" json:"assigned_by,omitempty"`
	AssignedAt          time.Time        `db:"assigned_at" json:"assigned_at"`
	StartsAt            *time.Time       `db:"starts_at" json:"starts_at,omitempty"`
	EndsAt              *time.Time       `db:"ends_at" json:"ends_at,omitempty"`
	Status              AssignmentStatus `db:"status" json:"status"`
	AcceptedAt          *time.Time       `db:"accepted_at" json:"accepted_at,omitempty"`
	CompletedAt         *time.Time       `db:"completed_at" json:"completed_at,omitempty"`
	CancelledAt         *time.Time       `db:"cancelled_at" json:"cancelled_at,omitempty"`
	Rank                *int             `db:"rank" json:"rank,omitempty"`
	RecommendationScore *float64         `db:"recommendation_score" json:"recommendation_score,omitempty"`
	RationaleTR         *string          `db:"rationale_tr" json:"rationale_tr,omitempty"`
	Notes               *string          `db:"notes" json:"notes,omitempty"`
	Metadata            []byte           `db:"metadata" json:"-"`
	CreatedAt           time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt           time.Time        `db:"updated_at" json:"updated_at"`
}

// HasConsent reports whether the employee has opted in.
func (a *Assignment) HasConsent() bool {
	return a.AcceptedAt != nil
}

// CanConsent reports whether the employee can still grant/decline consent.
func (a *Assignment) CanConsent() bool {
	return a.Status == AssignmentStatusAssigned
}

// CanStart reports whether the assignment can transition to in_progress.
func (a *Assignment) CanStart() bool {
	return a.Status == AssignmentStatusAssigned && a.HasConsent()
}

// CanComplete reports whether the assignment can transition to completed.
func (a *Assignment) CanComplete() bool {
	return a.Status == AssignmentStatusInProgress
}

// CanCancel reports whether the assignment can be cancelled.
func (a *Assignment) CanCancel() bool {
	return !IsTerminalStatus(a.Status)
}

// CanDecline reports whether the employee can decline consent.
func (a *Assignment) CanDecline() bool {
	return a.Status == AssignmentStatusAssigned
}

// Validate checks required foreign keys and enum values.
func (a *Assignment) Validate() error {
	fields := map[string]string{}
	if a.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if a.InterventionID == uuid.Nil {
		fields["intervention_id"] = "required"
	}
	if a.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if a.Status != "" && !IsValidAssignmentStatus(a.Status) {
		fields["status"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// AssignmentFilter narrows assignment lookups.
type AssignmentFilter struct {
	EmployeeID     *uuid.UUID
	InterventionID *uuid.UUID
	Status         *AssignmentStatus
	AssignedFrom   *time.Time
	AssignedTo     *time.Time
	Limit          int
	Offset         int
}

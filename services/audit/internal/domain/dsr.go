package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// DSRType enumerates the data subject rights from KVKK 11. madde.
type DSRType string

const (
	DSRAccess       DSRType = "access"
	DSRRectify      DSRType = "rectification"
	DSRErasure      DSRType = "erasure"
	DSRRestriction  DSRType = "restriction"
	DSRPortability  DSRType = "portability"
	DSRObjection    DSRType = "objection"
)

// ValidDSRTypes returns the full list of KVKK 11. madde rights.
func ValidDSRTypes() []DSRType {
	return []DSRType{
		DSRAccess, DSRRectify, DSRErasure, DSRRestriction, DSRPortability, DSRObjection,
	}
}

// Valid returns nil if the DSR type is known.
func (t DSRType) Valid() error {
	for _, v := range ValidDSRTypes() {
		if v == t {
			return nil
		}
	}
	return ErrInvalidDSRType
}

// DSRStatus enumerates DSR lifecycle states.
type DSRStatus string

const (
	DSRStatusReceived   DSRStatus = "received"
	DSRStatusVerifying  DSRStatus = "verifying"
	DSRStatusInProgress DSRStatus = "in_progress"
	DSRStatusCompleted  DSRStatus = "completed"
	DSRStatusRejected   DSRStatus = "rejected"
)

// ValidDSRStatuses returns the full list of valid statuses.
func ValidDSRStatuses() []DSRStatus {
	return []DSRStatus{
		DSRStatusReceived, DSRStatusVerifying, DSRStatusInProgress,
		DSRStatusCompleted, DSRStatusRejected,
	}
}

// Valid returns nil if the status is known.
func (s DSRStatus) Valid() error {
	for _, v := range ValidDSRStatuses() {
		if v == s {
			return nil
		}
	}
	return ErrInvalidDSRStatus
}

// allowedTransitions defines which status transitions are valid.
var allowedTransitions = map[DSRStatus][]DSRStatus{
	DSRStatusReceived:   {DSRStatusVerifying, DSRStatusRejected},
	DSRStatusVerifying:  {DSRStatusInProgress, DSRStatusRejected},
	DSRStatusInProgress: {DSRStatusCompleted, DSRStatusRejected},
}

// DSRRequest models a KVKK data subject rights request.
type DSRRequest struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	TenantID         uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	DataSubjectEmail string     `db:"data_subject_email" json:"data_subject_email"`
	RequestType      DSRType    `db:"request_type" json:"request_type"`
	Status           DSRStatus  `db:"status" json:"status"`
	ReceivedAt       time.Time  `db:"received_at" json:"received_at"`
	VerifiedAt       *time.Time `db:"verified_at" json:"verified_at,omitempty"`
	CompletedAt      *time.Time `db:"completed_at" json:"completed_at,omitempty"`
	RejectionReason  string     `db:"rejection_reason" json:"rejection_reason,omitempty"`
	ResponseDataURL  string     `db:"response_data_url" json:"response_data_url,omitempty"`
	HandledBy        *uuid.UUID `db:"handled_by" json:"handled_by,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
}

// Validate ensures all required fields on a new DSR request are present.
func (d *DSRRequest) Validate() error {
	if d.TenantID == uuid.Nil {
		return fmt.Errorf("%w: tenant_id required", ErrInvalidInput)
	}
	if d.DataSubjectEmail == "" {
		return fmt.Errorf("%w: data_subject_email required", ErrInvalidInput)
	}
	if err := d.RequestType.Valid(); err != nil {
		return err
	}
	return nil
}

// Transition moves the DSR to a new status if the transition is allowed.
func (d *DSRRequest) Transition(to DSRStatus, actorID uuid.UUID) error {
	if d.Status == DSRStatusCompleted || d.Status == DSRStatusRejected {
		return ErrDSRAlreadyCompleted
	}
	allowed, ok := allowedTransitions[d.Status]
	if !ok {
		return ErrInvalidTransition
	}
	valid := false
	for _, s := range allowed {
		if s == to {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("%w: cannot transition from %s to %s", ErrInvalidTransition, d.Status, to)
	}

	now := time.Now().UTC()
	d.Status = to
	d.HandledBy = &actorID

	switch to {
	case DSRStatusVerifying:
		d.VerifiedAt = &now
	case DSRStatusCompleted:
		d.CompletedAt = &now
	}
	return nil
}

// DueDate returns the KVKK-mandated 30-day deadline from receipt.
func (d *DSRRequest) DueDate() time.Time {
	return d.ReceivedAt.AddDate(0, 0, 30)
}

// IsOverdue reports whether the request has passed its 30-day deadline
// without being completed or rejected.
func (d *DSRRequest) IsOverdue() bool {
	if d.Status == DSRStatusCompleted || d.Status == DSRStatusRejected {
		return false
	}
	return time.Now().UTC().After(d.DueDate())
}

// ReceiveDSRRequest is the input payload for creating a new DSR.
type ReceiveDSRRequest struct {
	DataSubjectEmail string  `json:"data_subject_email"`
	RequestType      DSRType `json:"request_type"`
}

// DSRFilter defines query filters for listing DSR requests.
type DSRFilter struct {
	TenantID    uuid.UUID
	Status      string
	RequestType string
	Overdue     bool
	Page        int
	Limit       int
}

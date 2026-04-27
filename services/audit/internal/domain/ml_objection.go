package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// MLObjectionStatus enumerates the lifecycle of an ML prediction objection.
// Mirrors the DSRStatus state machine so the same audit machinery (30 day
// SLA, fan-out events, overdue query) can be reused end-to-end.
type MLObjectionStatus string

const (
	MLObjectionStatusReceived   MLObjectionStatus = "received"
	MLObjectionStatusVerifying  MLObjectionStatus = "verifying"
	MLObjectionStatusInProgress MLObjectionStatus = "in_progress"
	MLObjectionStatusCompleted  MLObjectionStatus = "completed"
	MLObjectionStatusRejected   MLObjectionStatus = "rejected"
)

// ValidMLObjectionStatuses returns the closed set of valid statuses.
func ValidMLObjectionStatuses() []MLObjectionStatus {
	return []MLObjectionStatus{
		MLObjectionStatusReceived,
		MLObjectionStatusVerifying,
		MLObjectionStatusInProgress,
		MLObjectionStatusCompleted,
		MLObjectionStatusRejected,
	}
}

// Valid returns nil if the status is known.
func (s MLObjectionStatus) Valid() error {
	for _, v := range ValidMLObjectionStatuses() {
		if v == s {
			return nil
		}
	}
	return fmt.Errorf("%w: invalid ml_objection status %q", ErrInvalidInput, s)
}

var mlObjectionTransitions = map[MLObjectionStatus][]MLObjectionStatus{
	MLObjectionStatusReceived:   {MLObjectionStatusVerifying, MLObjectionStatusRejected},
	MLObjectionStatusVerifying:  {MLObjectionStatusInProgress, MLObjectionStatusRejected},
	MLObjectionStatusInProgress: {MLObjectionStatusCompleted, MLObjectionStatusRejected},
}

// MLObjectionOutcome classifies the final decision on an objection. Aligned
// with KVKK Madde 22 + GDPR Article 22 requirements (data subject right to
// contest automated decisions).
type MLObjectionOutcome string

const (
	// MLObjectionOutcomeUpheld — itiraz haklı. Tahmin retract edilir,
	// downstream müdahaleler kaldırılır, kullanıcıya mail.
	MLObjectionOutcomeUpheld MLObjectionOutcome = "upheld"
	// MLObjectionOutcomeDismissed — itiraz reddedildi. DPO sign-off zorunlu,
	// kullanıcıya gerekçeli ret bildirimi.
	MLObjectionOutcomeDismissed MLObjectionOutcome = "dismissed"
	// MLObjectionOutcomeUnderReview — 30 gün SLA beklemede.
	MLObjectionOutcomeUnderReview MLObjectionOutcome = "under_review"
)

// Valid returns nil if the outcome is a known value.
func (o MLObjectionOutcome) Valid() error {
	switch o {
	case MLObjectionOutcomeUpheld, MLObjectionOutcomeDismissed, MLObjectionOutcomeUnderReview:
		return nil
	}
	return fmt.Errorf("%w: invalid ml_objection outcome %q", ErrInvalidInput, o)
}

// MLObjection models a KVKK Madde 22 objection against an ML prediction.
type MLObjection struct {
	ID              uuid.UUID         `db:"id" json:"id"`
	TenantID        uuid.UUID         `db:"tenant_id" json:"tenant_id"`
	UserID          uuid.UUID         `db:"user_id" json:"user_id"`
	PredictionID    uuid.UUID         `db:"prediction_id" json:"prediction_id"`
	Reason          string            `db:"reason" json:"reason"`
	ContactEmail    string            `db:"contact_email" json:"contact_email,omitempty"`
	Status          MLObjectionStatus `db:"status" json:"status"`
	RejectionReason string            `db:"rejection_reason" json:"rejection_reason,omitempty"`
	ResolutionNote  string            `db:"resolution_note" json:"resolution_note,omitempty"`
	ReviewerUserID  *uuid.UUID        `db:"reviewer_user_id" json:"reviewer_user_id,omitempty"`
	ObjectedAt      time.Time         `db:"objected_at" json:"objected_at"`
	ReviewedAt      *time.Time        `db:"reviewed_at" json:"reviewed_at,omitempty"`
	CompletedAt     *time.Time        `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt       time.Time         `db:"created_at" json:"created_at"`

	// KVKK Madde 22 decision fields (migration 062).
	ResolutionOutcome      *MLObjectionOutcome `db:"resolution_outcome" json:"resolution_outcome,omitempty"`
	DPOUserID              *uuid.UUID          `db:"dpo_user_id" json:"dpo_user_id,omitempty"`
	DPOSignedAt            *time.Time          `db:"dpo_signed_at" json:"dpo_signed_at,omitempty"`
	PredictionRetractedAt  *time.Time          `db:"prediction_retracted_at" json:"prediction_retracted_at,omitempty"`
	ReviewerIP             *string             `db:"reviewer_ip" json:"reviewer_ip,omitempty"`
	ReviewerUA             *string             `db:"reviewer_ua" json:"reviewer_ua,omitempty"`
}

// Validate enforces mandatory fields.
func (o *MLObjection) Validate() error {
	if o.TenantID == uuid.Nil {
		return fmt.Errorf("%w: tenant_id required", ErrInvalidInput)
	}
	if o.UserID == uuid.Nil {
		return fmt.Errorf("%w: user_id required", ErrInvalidInput)
	}
	if o.PredictionID == uuid.Nil {
		return fmt.Errorf("%w: prediction_id required", ErrInvalidInput)
	}
	if len(o.Reason) < 5 {
		return fmt.Errorf("%w: reason must be at least 5 chars", ErrInvalidInput)
	}
	return nil
}

// Transition moves the objection to a new status following the allowed graph.
func (o *MLObjection) Transition(to MLObjectionStatus, actorID uuid.UUID) error {
	if o.Status == MLObjectionStatusCompleted || o.Status == MLObjectionStatusRejected {
		return fmt.Errorf("%w: objection already finalised", ErrInvalidTransition)
	}
	allowed, ok := mlObjectionTransitions[o.Status]
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
		return fmt.Errorf("%w: cannot transition from %s to %s", ErrInvalidTransition, o.Status, to)
	}
	now := time.Now().UTC()
	o.Status = to
	o.ReviewerUserID = &actorID
	switch to {
	case MLObjectionStatusVerifying, MLObjectionStatusInProgress:
		o.ReviewedAt = &now
	case MLObjectionStatusCompleted, MLObjectionStatusRejected:
		o.CompletedAt = &now
	}
	return nil
}

// DueDate returns the KVKK 30-day review deadline.
func (o *MLObjection) DueDate() time.Time {
	return o.ObjectedAt.AddDate(0, 0, 30)
}

// IsOverdue reports whether the objection has missed its SLA.
func (o *MLObjection) IsOverdue() bool {
	if o.Status == MLObjectionStatusCompleted || o.Status == MLObjectionStatusRejected {
		return false
	}
	return time.Now().UTC().After(o.DueDate())
}

// MLObjectionFilter defines query filters for the admin review queue.
type MLObjectionFilter struct {
	TenantID uuid.UUID
	Status   string
	Overdue  bool
	UserID   uuid.UUID
	Page     int
	Limit    int
}

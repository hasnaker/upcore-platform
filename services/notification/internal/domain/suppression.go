package domain

import (
	"time"

	"github.com/google/uuid"
)

// SuppReason is why an email was added to the suppression list.
type SuppReason string

// Suppression reasons.
const (
	SuppReasonBounce    SuppReason = "bounce"
	SuppReasonComplaint SuppReason = "complaint"
	SuppReasonManual    SuppReason = "manual"
	SuppReasonUnsub     SuppReason = "unsubscribe"
)

// Suppression is an email on the do-not-deliver list.
type Suppression struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	Email      string     `db:"email" json:"email"`
	Reason     SuppReason `db:"reason" json:"reason"`
	BounceCount int       `db:"bounce_count" json:"bounce_count"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time  `db:"updated_at" json:"updated_at"`
}

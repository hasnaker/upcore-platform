package domain

import (
	"time"

	"github.com/google/uuid"
)

// OfferStatus enumerates offer lifecycle states.
type OfferStatus string

const (
	OfferDraft     OfferStatus = "draft"
	OfferSent      OfferStatus = "sent"
	OfferAccepted  OfferStatus = "accepted"
	OfferDeclined  OfferStatus = "declined"
	OfferExpired   OfferStatus = "expired"
	OfferWithdrawn OfferStatus = "withdrawn"
)

// IsValid reports whether the status is a known value.
func (s OfferStatus) IsValid() bool {
	switch s {
	case OfferDraft, OfferSent, OfferAccepted, OfferDeclined, OfferExpired, OfferWithdrawn:
		return true
	}
	return false
}

// Offer represents a job offer to a candidate.
type Offer struct {
	ID            uuid.UUID   `db:"id" json:"id"`
	TenantID      uuid.UUID   `db:"tenant_id" json:"tenant_id"`
	ApplicationID uuid.UUID   `db:"application_id" json:"application_id"`
	SalaryTRY     float64     `db:"salary_try" json:"salary_try"`
	BonusTRY      *float64    `db:"bonus_try" json:"bonus_try,omitempty"`
	StartDate     time.Time   `db:"start_date" json:"start_date"`
	ExpiryDate    time.Time   `db:"expiry_date" json:"expiry_date"`
	Benefits      JSONB       `db:"benefits" json:"benefits,omitempty"`
	Status        OfferStatus `db:"status" json:"status"`
	DocumentID    *uuid.UUID  `db:"document_id" json:"document_id,omitempty"`
	SentAt        *time.Time  `db:"sent_at" json:"sent_at,omitempty"`
	RespondedAt   *time.Time  `db:"responded_at" json:"responded_at,omitempty"`
	CreatedBy     *uuid.UUID  `db:"created_by" json:"created_by,omitempty"`
	CreatedAt     time.Time   `db:"created_at" json:"created_at"`
}

// Validate checks required fields.
func (o *Offer) Validate() error {
	fields := map[string]string{}
	if o.ApplicationID == uuid.Nil {
		fields["application_id"] = "required"
	}
	if o.SalaryTRY <= 0 {
		fields["salary_try"] = "must be > 0"
	}
	if o.StartDate.IsZero() {
		fields["start_date"] = "required"
	}
	if o.ExpiryDate.IsZero() {
		fields["expiry_date"] = "required"
	}
	if !o.ExpiryDate.IsZero() && !o.StartDate.IsZero() && o.ExpiryDate.Before(o.StartDate) {
		fields["expiry_date"] = "must be after start_date"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// IsExpired returns true when the offer has passed its expiry date.
func (o *Offer) IsExpired() bool {
	return time.Now().After(o.ExpiryDate)
}

// CanSend returns true when the offer is in a sendable state.
func (o *Offer) CanSend() bool {
	return o.Status == OfferDraft
}

// ApplyDefaults fills in defaults.
func (o *Offer) ApplyDefaults() {
	if o.Status == "" {
		o.Status = OfferDraft
	}
	if len(o.Benefits) == 0 {
		o.Benefits = JSONB("{}")
	}
}

package domain

import (
	"errors"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
)

// OfferStatus enumerates the offer-letter lifecycle states.
type OfferStatus string

const (
	OfferDraft    OfferStatus = "draft"
	OfferSent     OfferStatus = "sent"
	OfferViewed   OfferStatus = "viewed"
	OfferAccepted OfferStatus = "accepted"
	OfferDeclined OfferStatus = "declined"
	OfferExpired  OfferStatus = "expired"
	OfferRevoked  OfferStatus = "revoked"
)

// IsValid reports whether the status is a known value.
func (s OfferStatus) IsValid() bool {
	switch s {
	case OfferDraft, OfferSent, OfferViewed, OfferAccepted, OfferDeclined, OfferExpired, OfferRevoked:
		return true
	}
	return false
}

// IsTerminal reports whether the status is final (no further transitions).
func (s OfferStatus) IsTerminal() bool {
	switch s {
	case OfferAccepted, OfferDeclined, OfferExpired, OfferRevoked:
		return true
	}
	return false
}

// Offer-related domain errors.
var (
	ErrOfferNotFound       = errors.New("offer not found")
	ErrOfferInvalidStatus  = errors.New("invalid offer status transition")
	ErrOfferAlreadyDecided = errors.New("offer has already been decided")
	ErrOfferExpired        = errors.New("offer has expired")
	ErrOfferNotSent        = errors.New("offer must be sent before it can be accepted or declined")
)

// OfferLetter is a job offer extended to a candidate prior to hire.
//
// Column names mirror app.offer_letters (migration 023_employee_lifecycle).
type OfferLetter struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	CandidateID    *uuid.UUID `db:"candidate_id" json:"candidate_id,omitempty"`
	RequisitionID  *uuid.UUID `db:"requisition_id" json:"requisition_id,omitempty"`
	EmployeeID     *uuid.UUID `db:"employee_id" json:"employee_id,omitempty"`

	AdSoyad       string     `db:"ad_soyad" json:"ad_soyad"`
	Email         string     `db:"email" json:"email"`
	PositionTitle string     `db:"position_title" json:"position_title"`
	DepartmentID  *uuid.UUID `db:"department_id" json:"department_id,omitempty"`
	PositionID    *uuid.UUID `db:"position_id" json:"position_id,omitempty"`

	SalaryBrut     *float64 `db:"salary_brut" json:"salary_brut,omitempty"`
	SalaryCurrency string   `db:"salary_currency" json:"salary_currency"`
	BonusAnnual    *float64 `db:"bonus_annual" json:"bonus_annual,omitempty"`
	StockOptions   *string  `db:"stock_options" json:"stock_options,omitempty"`
	Benefits       JSONB    `db:"benefits" json:"benefits"`

	StartDate time.Time   `db:"start_date" json:"start_date"`
	ExpiresAt time.Time   `db:"expires_at" json:"expires_at"`
	Status    OfferStatus `db:"status" json:"status"`

	SentAt        *time.Time `db:"sent_at" json:"sent_at,omitempty"`
	ViewedAt      *time.Time `db:"viewed_at" json:"viewed_at,omitempty"`
	DecidedAt     *time.Time `db:"decided_at" json:"decided_at,omitempty"`
	DeclineReason *string    `db:"decline_reason" json:"decline_reason,omitempty"`
	SentBy        *uuid.UUID `db:"sent_by" json:"sent_by,omitempty"`

	TemplateID *uuid.UUID `db:"template_id" json:"template_id,omitempty"`
	PDFURL     *string    `db:"pdf_url" json:"pdf_url,omitempty"`
	Payload    JSONB      `db:"payload" json:"payload"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (o *OfferLetter) ApplyDefaults() {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.Status == "" {
		o.Status = OfferDraft
	}
	if o.SalaryCurrency == "" {
		o.SalaryCurrency = "TRY"
	}
	if len(o.Benefits) == 0 {
		o.Benefits = JSONB("{}")
	}
	if len(o.Payload) == 0 {
		o.Payload = JSONB("{}")
	}
}

// Validate enforces required-field + basic format rules.
func (o *OfferLetter) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(o.AdSoyad) == "" {
		fields["ad_soyad"] = "required"
	}
	if strings.TrimSpace(o.Email) == "" {
		fields["email"] = "required"
	} else if _, err := mail.ParseAddress(o.Email); err != nil {
		fields["email"] = "invalid"
	}
	if strings.TrimSpace(o.PositionTitle) == "" {
		fields["position_title"] = "required"
	}
	if o.StartDate.IsZero() {
		fields["start_date"] = "required"
	}
	if o.ExpiresAt.IsZero() {
		fields["expires_at"] = "required"
	} else if !o.StartDate.IsZero() && o.ExpiresAt.Before(time.Now().UTC()) {
		fields["expires_at"] = "must_be_future"
	}
	if !o.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if o.SalaryBrut != nil && *o.SalaryBrut < 0 {
		fields["salary_brut"] = "must_be_positive"
	}
	if o.BonusAnnual != nil && *o.BonusAnnual < 0 {
		fields["bonus_annual"] = "must_be_positive"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// CanTransitionTo reports whether the offer may move to the target status.
// State machine:
//
//	draft    -> sent | revoked
//	sent     -> viewed | accepted | declined | expired | revoked
//	viewed   -> accepted | declined | expired | revoked
//	accepted/declined/expired/revoked are terminal
func (o *OfferLetter) CanTransitionTo(next OfferStatus) bool {
	if !next.IsValid() {
		return false
	}
	if o.Status == next {
		return false
	}
	if o.Status.IsTerminal() {
		return false
	}
	switch o.Status {
	case OfferDraft:
		return next == OfferSent || next == OfferRevoked
	case OfferSent, OfferViewed:
		switch next {
		case OfferViewed, OfferAccepted, OfferDeclined, OfferExpired, OfferRevoked:
			return true
		}
	}
	return false
}

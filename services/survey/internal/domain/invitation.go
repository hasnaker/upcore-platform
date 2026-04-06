package domain

import (
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/google/uuid"
)

// InvitationStatus mirrors app.survey_invitations.status.
type InvitationStatus string

// Invitation status values.
const (
	InvitationPending   InvitationStatus = "pending"
	InvitationSent      InvitationStatus = "sent"
	InvitationOpened    InvitationStatus = "opened"
	InvitationCompleted InvitationStatus = "completed"
	InvitationExpired   InvitationStatus = "expired"
	InvitationBounced   InvitationStatus = "bounced"
)

// IsValid reports whether the invitation status is a recognised value.
func (s InvitationStatus) IsValid() bool {
	switch s {
	case InvitationPending, InvitationSent, InvitationOpened,
		InvitationCompleted, InvitationExpired, InvitationBounced:
		return true
	}
	return false
}

// Invitation corresponds to a row in app.survey_invitations.
type Invitation struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	TenantID       uuid.UUID        `db:"tenant_id" json:"tenant_id"`
	SurveyID       uuid.UUID        `db:"survey_id" json:"survey_id"`
	EmployeeID     uuid.UUID        `db:"employee_id" json:"employee_id"`
	Token          string           `db:"token" json:"token"`
	SentAt         *time.Time       `db:"sent_at" json:"sent_at,omitempty"`
	OpenedAt       *time.Time       `db:"opened_at" json:"opened_at,omitempty"`
	CompletedAt    *time.Time       `db:"completed_at" json:"completed_at,omitempty"`
	RemindersSent  int              `db:"reminders_sent" json:"reminders_sent"`
	LastReminderAt *time.Time       `db:"last_reminder_at" json:"last_reminder_at,omitempty"`
	Status         InvitationStatus `db:"status" json:"status"`
	ExpiresAt      *time.Time       `db:"expires_at" json:"expires_at,omitempty"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time        `db:"updated_at" json:"updated_at"`
}

// GenerateToken returns a URL-safe random token for invitation links.
func GenerateToken() string {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		// Fallback to uuid-based token if crypto/rand fails unexpectedly.
		return uuid.NewString() + uuid.NewString()
	}
	return base64.RawURLEncoding.EncodeToString(b[:])
}

// IsExpired reports whether the invitation has expired as of now.
func (i *Invitation) IsExpired(now time.Time) bool {
	if i.ExpiresAt == nil {
		return false
	}
	return now.After(*i.ExpiresAt)
}

// IsCompleted reports whether the invitation has been submitted.
func (i *Invitation) IsCompleted() bool {
	return i.CompletedAt != nil || i.Status == InvitationCompleted
}

// NeedsReminder reports whether a reminder should be sent now.
func (i *Invitation) NeedsReminder(now time.Time, cadence time.Duration, maxReminders int) bool {
	if i.IsCompleted() || i.IsExpired(now) {
		return false
	}
	if i.RemindersSent >= maxReminders {
		return false
	}
	if i.LastReminderAt != nil && now.Sub(*i.LastReminderAt) < cadence {
		return false
	}
	if i.SentAt == nil {
		return false
	}
	return now.Sub(*i.SentAt) >= cadence
}

// ApplyDefaults sets default values before insert.
func (i *Invitation) ApplyDefaults() {
	if i.Status == "" {
		i.Status = InvitationPending
	}
	if i.Token == "" {
		i.Token = GenerateToken()
	}
}

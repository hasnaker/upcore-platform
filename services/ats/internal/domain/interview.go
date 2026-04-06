package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// InterviewStatus enumerates interview lifecycle states.
type InterviewStatus string

const (
	InterviewScheduled InterviewStatus = "scheduled"
	InterviewCompleted InterviewStatus = "completed"
	InterviewCanceled  InterviewStatus = "canceled"
	InterviewNoShow    InterviewStatus = "no_show"
)

// IsValid reports whether the status is a known value.
func (s InterviewStatus) IsValid() bool {
	switch s {
	case InterviewScheduled, InterviewCompleted, InterviewCanceled, InterviewNoShow:
		return true
	}
	return false
}

// Recommendation enumerates interviewer recommendations.
type Recommendation string

const (
	RecStrongHire   Recommendation = "strong_hire"
	RecHire         Recommendation = "hire"
	RecNoHire       Recommendation = "no_hire"
	RecStrongNoHire Recommendation = "strong_no_hire"
)

// IsValid reports whether the recommendation is a known value.
func (r Recommendation) IsValid() bool {
	switch r {
	case RecStrongHire, RecHire, RecNoHire, RecStrongNoHire:
		return true
	}
	return false
}

// Interview represents a scheduled interview for an application.
type Interview struct {
	ID              uuid.UUID       `db:"id" json:"id"`
	TenantID        uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	ApplicationID   uuid.UUID       `db:"application_id" json:"application_id"`
	Round           int             `db:"round" json:"round"`
	ScheduledAt     time.Time       `db:"scheduled_at" json:"scheduled_at"`
	DurationMinutes int             `db:"duration_minutes" json:"duration_minutes"`
	InterviewerIDs  StringArray     `db:"interviewer_ids" json:"interviewer_ids"`
	Location        *string         `db:"location" json:"location,omitempty"`
	MeetingURL      *string         `db:"meeting_url" json:"meeting_url,omitempty"`
	Status          InterviewStatus `db:"status" json:"status"`
	Feedback        JSONB           `db:"feedback" json:"feedback,omitempty"`
	OverallScore    *int            `db:"overall_score" json:"overall_score,omitempty"`
	Recommendation  *Recommendation `db:"recommendation" json:"recommendation,omitempty"`
	CreatedAt       time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time       `db:"updated_at" json:"updated_at"`
}

// Validate checks required fields.
func (i *Interview) Validate() error {
	fields := map[string]string{}
	if i.ApplicationID == uuid.Nil {
		fields["application_id"] = "required"
	}
	if i.Round <= 0 {
		fields["round"] = "must be > 0"
	}
	if i.ScheduledAt.IsZero() {
		fields["scheduled_at"] = "required"
	}
	if i.DurationMinutes <= 0 {
		fields["duration_minutes"] = "must be > 0"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// IsPast returns true when the interview's scheduled time is in the past.
func (i *Interview) IsPast() bool {
	return time.Now().After(i.ScheduledAt.Add(time.Duration(i.DurationMinutes) * time.Minute))
}

// ApplyDefaults fills in defaults.
func (i *Interview) ApplyDefaults() {
	if i.Status == "" {
		i.Status = InterviewScheduled
	}
	if i.DurationMinutes <= 0 {
		i.DurationMinutes = 60
	}
	if i.Round <= 0 {
		i.Round = 1
	}
}

// ParseUUIDArray converts a StringArray of UUID strings into []uuid.UUID.
func ParseUUIDArray(arr StringArray) []uuid.UUID {
	out := make([]uuid.UUID, 0, len(arr))
	for _, s := range arr {
		if id, err := uuid.Parse(strings.TrimSpace(s)); err == nil {
			out = append(out, id)
		}
	}
	return out
}

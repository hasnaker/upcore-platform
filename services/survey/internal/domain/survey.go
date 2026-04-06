package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// SurveyType enum mirrors the CHECK constraint on app.surveys.survey_type.
type SurveyType string

// Survey types.
const (
	SurveyTypePulse      SurveyType = "pulse"
	SurveyTypeENPS       SurveyType = "enps"
	SurveyTypeEngagement SurveyType = "engagement"
	SurveyTypeWellbeing  SurveyType = "wellbeing"
	SurveyTypeOnboarding SurveyType = "onboarding"
	SurveyTypeExit       SurveyType = "exit"
	SurveyTypeCustom     SurveyType = "custom"
)

// IsValid reports whether the survey type is a recognised value.
func (t SurveyType) IsValid() bool {
	switch t {
	case SurveyTypePulse, SurveyTypeENPS, SurveyTypeEngagement,
		SurveyTypeWellbeing, SurveyTypeOnboarding, SurveyTypeExit, SurveyTypeCustom:
		return true
	}
	return false
}

// Cadence enum mirrors the CHECK constraint on app.surveys.cadence.
type Cadence string

// Cadence values.
const (
	CadenceOneTime    Cadence = "one_time"
	CadenceWeekly     Cadence = "weekly"
	CadenceBiweekly   Cadence = "biweekly"
	CadenceMonthly    Cadence = "monthly"
	CadenceQuarterly  Cadence = "quarterly"
	CadenceSemiannual Cadence = "semiannual"
	CadenceAnnual     Cadence = "annual"
	CadenceAdHoc      Cadence = "ad_hoc"
)

// IsValid reports whether the cadence is a recognised value.
func (c Cadence) IsValid() bool {
	switch c {
	case CadenceOneTime, CadenceWeekly, CadenceBiweekly, CadenceMonthly,
		CadenceQuarterly, CadenceSemiannual, CadenceAnnual, CadenceAdHoc:
		return true
	}
	return false
}

// SurveyStatus enum mirrors the CHECK constraint on app.surveys.status.
type SurveyStatus string

// Survey status values.
const (
	StatusDraft     SurveyStatus = "draft"
	StatusScheduled SurveyStatus = "scheduled"
	StatusActive    SurveyStatus = "active"
	StatusPaused    SurveyStatus = "paused"
	StatusCompleted SurveyStatus = "completed"
	StatusArchived  SurveyStatus = "archived"
)

// IsValid reports whether the status is a recognised value.
func (s SurveyStatus) IsValid() bool {
	switch s {
	case StatusDraft, StatusScheduled, StatusActive, StatusPaused,
		StatusCompleted, StatusArchived:
		return true
	}
	return false
}

// Survey corresponds to a row in app.surveys.
type Survey struct {
	ID            uuid.UUID     `db:"id" json:"id"`
	TenantID      uuid.UUID     `db:"tenant_id" json:"tenant_id"`
	InstrumentID  *uuid.UUID    `db:"instrument_id" json:"instrument_id,omitempty"`
	TitleTR       string        `db:"title_tr" json:"title_tr"`
	TitleEN       *string       `db:"title_en" json:"title_en,omitempty"`
	DescriptionTR *string       `db:"description_tr" json:"description_tr,omitempty"`
	SurveyType    SurveyType    `db:"survey_type" json:"survey_type"`
	Audience      JSONB         `db:"audience" json:"audience"`
	IsAnonymous   bool          `db:"is_anonymous" json:"is_anonymous"`
	Cadence       *Cadence      `db:"cadence" json:"cadence,omitempty"`
	StartsAt      *time.Time    `db:"starts_at" json:"starts_at,omitempty"`
	EndsAt        *time.Time    `db:"ends_at" json:"ends_at,omitempty"`
	ReminderDays  pq.Int64Array `db:"reminder_days" json:"reminder_days"`
	Status        SurveyStatus  `db:"status" json:"status"`
	CreatedBy     *uuid.UUID    `db:"created_by" json:"created_by,omitempty"`
	CreatedAt     time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time     `db:"updated_at" json:"updated_at"`
	DeletedAt     *time.Time    `db:"deleted_at" json:"deleted_at,omitempty"`
}

// ApplyDefaults fills in defaults required by the DB constraints.
func (s *Survey) ApplyDefaults() {
	if s.SurveyType == "" {
		s.SurveyType = SurveyTypePulse
	}
	if s.Status == "" {
		s.Status = StatusDraft
	}
	if len(s.Audience) == 0 {
		s.Audience = JSONB("{}")
	}
	if len(s.ReminderDays) == 0 {
		s.ReminderDays = pq.Int64Array{3, 7}
	}
}

// Validate applies domain-level invariants.
func (s *Survey) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(s.TitleTR) == "" {
		fields["title_tr"] = "required"
	}
	if s.SurveyType != "" && !s.SurveyType.IsValid() {
		fields["survey_type"] = "invalid"
	}
	if s.Cadence != nil && *s.Cadence != "" && !s.Cadence.IsValid() {
		fields["cadence"] = "invalid"
	}
	if s.Status != "" && !s.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if s.StartsAt != nil && s.EndsAt != nil && s.EndsAt.Before(*s.StartsAt) {
		fields["ends_at"] = "must be >= starts_at"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// IsActive reports whether the survey is currently open for responses.
func (s *Survey) IsActive(now time.Time) bool {
	if s.Status != StatusActive && s.Status != StatusScheduled {
		return false
	}
	if s.StartsAt != nil && now.Before(*s.StartsAt) {
		return false
	}
	if s.EndsAt != nil && now.After(*s.EndsAt) {
		return false
	}
	return true
}

// CanTransition reports whether the status transition is allowed.
func CanTransition(from, to SurveyStatus) bool {
	if from == to {
		return true
	}
	allowed := map[SurveyStatus][]SurveyStatus{
		StatusDraft:     {StatusScheduled, StatusActive, StatusArchived},
		StatusScheduled: {StatusActive, StatusPaused, StatusArchived, StatusDraft},
		StatusActive:    {StatusPaused, StatusCompleted, StatusArchived},
		StatusPaused:    {StatusActive, StatusArchived, StatusCompleted},
		StatusCompleted: {StatusArchived},
		StatusArchived:  {},
	}
	for _, v := range allowed[from] {
		if v == to {
			return true
		}
	}
	return false
}

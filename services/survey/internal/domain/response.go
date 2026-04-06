package domain

import (
	"time"

	"github.com/google/uuid"
)

// Response corresponds to a row in app.survey_responses.
//
// When the owning survey is anonymous the EmployeeID / InvitationID fields
// are deliberately NULLed at the service layer before insert so that
// individual responses can never be traced back to a specific employee.
type Response struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	SurveyID        uuid.UUID  `db:"survey_id" json:"survey_id"`
	InvitationID    *uuid.UUID `db:"invitation_id" json:"invitation_id,omitempty"`
	EmployeeID      *uuid.UUID `db:"employee_id" json:"employee_id,omitempty"`
	AssessmentID    *uuid.UUID `db:"assessment_id" json:"assessment_id,omitempty"`
	Responses       JSONB      `db:"responses" json:"responses"`
	CommentTR       *string    `db:"comment_tr" json:"comment_tr,omitempty"`
	CompletedAt     time.Time  `db:"completed_at" json:"completed_at"`
	DurationSeconds *int       `db:"duration_seconds" json:"duration_seconds,omitempty"`
	Locale          *string    `db:"locale" json:"locale,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
}

// Answer represents a single structured answer inside the JSONB payload.
type Answer struct {
	ItemCode  string  `json:"item_code"`
	ItemID    *string `json:"item_id,omitempty"`
	ValueInt  *int    `json:"value_int,omitempty"`
	ValueText *string `json:"value_text,omitempty"`
}

// AnonymizeContext captures the aggregate segment keys for a response. These
// are the only attributes persisted alongside a response when the survey is
// anonymous — the individual employee_id is discarded.
type AnonymizeContext struct {
	DepartmentID  *uuid.UUID `json:"department_id,omitempty"`
	PositionLevel *string    `json:"position_level,omitempty"`
	TenureBucket  *string    `json:"tenure_bucket,omitempty"`
}

// TenureBucket returns a coarse bucket label for a given number of
// months of tenure. Used for k-anonymity safe segmentation.
func TenureBucket(months int) string {
	switch {
	case months < 6:
		return "0-6m"
	case months < 12:
		return "6-12m"
	case months < 24:
		return "1-2y"
	case months < 60:
		return "2-5y"
	case months < 120:
		return "5-10y"
	default:
		return "10y+"
	}
}

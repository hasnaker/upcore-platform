package domain

import (
	"math"
	"time"

	"github.com/google/uuid"
)

// Outcome mirrors app.intervention_outcomes.
type Outcome struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	TenantID         uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	AssignmentID     uuid.UUID  `db:"assignment_id" json:"assignment_id"`
	InterventionID   uuid.UUID  `db:"intervention_id" json:"intervention_id"`
	EmployeeID       uuid.UUID  `db:"employee_id" json:"employee_id"`
	PreBATScore      *float64   `db:"pre_bat_score" json:"pre_bat_score,omitempty"`
	PostBATScore     *float64   `db:"post_bat_score" json:"post_bat_score,omitempty"`
	EffectSize       *float64   `db:"effect_size" json:"effect_size,omitempty"`
	PreAssessmentID  *uuid.UUID `db:"pre_assessment_id" json:"pre_assessment_id,omitempty"`
	PostAssessmentID *uuid.UUID `db:"post_assessment_id" json:"post_assessment_id,omitempty"`
	Success          *bool      `db:"success" json:"success,omitempty"`
	MeasuredAt       time.Time  `db:"measured_at" json:"measured_at"`
	HorizonWeeks     *int       `db:"horizon_weeks" json:"horizon_weeks,omitempty"`
	Notes            *string    `db:"notes" json:"notes,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
}

// ComputeEffect returns (pre - post) as a raw delta on the 1-5 BAT scale.
// A positive delta means burnout score decreased (improvement).
func ComputeEffect(pre, post float64) float64 {
	return pre - post
}

// IsSuccess reports whether the pre-post drop meets the success threshold.
// Success = post <= pre - threshold, i.e. the drop is at least `threshold`.
func IsSuccess(pre, post, threshold float64) bool {
	return (pre - post) >= threshold
}

// ValidBATScore returns true when score is in [1.0, 5.0] on the BAT-12-TR scale.
func ValidBATScore(score float64) bool {
	return score >= 1.0 && score <= 5.0 && !math.IsNaN(score) && !math.IsInf(score, 0)
}

// Validate checks pre/post score ranges when provided.
func (o *Outcome) Validate() error {
	fields := map[string]string{}
	if o.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if o.AssignmentID == uuid.Nil {
		fields["assignment_id"] = "required"
	}
	if o.InterventionID == uuid.Nil {
		fields["intervention_id"] = "required"
	}
	if o.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if o.PreBATScore != nil && !ValidBATScore(*o.PreBATScore) {
		fields["pre_bat_score"] = "out_of_range"
	}
	if o.PostBATScore != nil && !ValidBATScore(*o.PostBATScore) {
		fields["post_bat_score"] = "out_of_range"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

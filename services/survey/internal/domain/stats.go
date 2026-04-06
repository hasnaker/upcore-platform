package domain

import (
	"math"
	"time"

	"github.com/google/uuid"
)

// SurveyStats is the aggregated statistics payload returned to HR users.
// It always enforces the k-anonymity minimum.
type SurveyStats struct {
	SurveyID       uuid.UUID       `json:"survey_id"`
	DepartmentID   *uuid.UUID      `json:"department_id,omitempty"`
	N              int             `json:"n"`
	ResponseRate   float64         `json:"response_rate"`
	Invited        int             `json:"invited"`
	Completed      int             `json:"completed"`
	Suppressed     bool            `json:"suppressed"`
	Reason         string          `json:"reason,omitempty"`
	Dimensions     []AggregateStat `json:"dimensions,omitempty"`
	ENPSScore      *float64        `json:"enps_score,omitempty"`
	BurnoutRedPct  *float64        `json:"burnout_red_pct,omitempty"`
	ComputedAt     time.Time       `json:"computed_at"`
}

// NewSuppressedStats constructs a SurveyStats with the suppression flag set.
func NewSuppressedStats(surveyID uuid.UUID, deptID *uuid.UUID, n int) *SurveyStats {
	return &SurveyStats{
		SurveyID:     surveyID,
		DepartmentID: deptID,
		N:            n,
		Suppressed:   true,
		Reason:       "insufficient_respondents",
		ComputedAt:   time.Now().UTC(),
	}
}

// Mean computes the arithmetic mean of the given values.
func Mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	var sum float64
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

// StdDev computes the sample standard deviation.
func StdDev(values []float64) float64 {
	if len(values) < 2 {
		return 0
	}
	m := Mean(values)
	var sum float64
	for _, v := range values {
		sum += (v - m) * (v - m)
	}
	return math.Sqrt(sum / float64(len(values)-1))
}

// ResponseRate returns completed / invited safely (0..1).
func ResponseRate(completed, invited int) float64 {
	if invited <= 0 {
		return 0
	}
	r := float64(completed) / float64(invited)
	if r > 1 {
		return 1
	}
	return r
}

package domain

import (
	"time"

	"github.com/google/uuid"
)

// DistStatus is the lifecycle status of a survey distribution.
type DistStatus string

const (
	DistStatusPending  DistStatus = "pending"
	DistStatusOpen     DistStatus = "open"
	DistStatusClosed   DistStatus = "closed"
	DistStatusAnalyzed DistStatus = "analyzed"
)

// IsValid reports whether the distribution status is recognised.
func (s DistStatus) IsValid() bool {
	switch s {
	case DistStatusPending, DistStatusOpen, DistStatusClosed, DistStatusAnalyzed:
		return true
	}
	return false
}

// Distribution corresponds to a row in app.survey_distributions.
type Distribution struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	TenantID      uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ScheduleID    *uuid.UUID `db:"schedule_id" json:"schedule_id,omitempty"`
	SurveyID      uuid.UUID  `db:"survey_id" json:"survey_id"`
	DistributedAt time.Time  `db:"distributed_at" json:"distributed_at"`
	ClosesAt      time.Time  `db:"closes_at" json:"closes_at"`
	TargetCount   int        `db:"target_count" json:"target_count"`
	ResponseCount int        `db:"response_count" json:"response_count"`
	Status        DistStatus `db:"status" json:"status"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
}

// IsOpen reports whether the distribution is still accepting responses.
func (d *Distribution) IsOpen() bool {
	return d.Status == DistStatusOpen
}

// ResponseRate returns completed / target safely in [0, 1].
func (d *Distribution) ResponseRate() float64 {
	return ResponseRate(d.ResponseCount, d.TargetCount)
}

// Validate checks required fields and enum values.
func (d *Distribution) Validate() error {
	fields := map[string]string{}
	if d.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if d.SurveyID == uuid.Nil {
		fields["survey_id"] = "required"
	}
	if !d.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if d.ClosesAt.Before(d.DistributedAt) {
		fields["closes_at"] = "must be after distributed_at"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

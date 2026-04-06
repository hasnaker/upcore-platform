package domain

import (
	"time"

	"github.com/google/uuid"
)

// Metric is the usage counter metric enum.
type Metric string

const (
	MetricEmployees   Metric = "employees"
	MetricAssessments Metric = "assessments"
	MetricStorageMB   Metric = "storage_mb"
	MetricAPICalls    Metric = "api_calls"
)

// UsageCounter is a per-tenant monthly usage record.
type UsageCounter struct {
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Metric      Metric    `db:"metric" json:"metric"`
	Value       int64     `db:"value" json:"value"`
	PeriodStart time.Time `db:"period_start" json:"period_start"`
	PeriodEnd   time.Time `db:"period_end" json:"period_end"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// IsOverLimit reports whether the counter exceeds the cap. A cap of 0 means unlimited.
func (u *UsageCounter) IsOverLimit(cap int64) bool {
	if cap <= 0 {
		return false
	}
	return u.Value >= cap
}

// CurrentPeriod returns the UTC first-of-month start and first-of-next-month end.
func CurrentPeriod(now time.Time) (start, end time.Time) {
	loc := now.Location()
	start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
	end = start.AddDate(0, 1, 0)
	return start, end
}

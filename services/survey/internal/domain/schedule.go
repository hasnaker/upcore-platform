package domain

import (
	"time"

	"github.com/google/uuid"
)

// Schedule corresponds to a row in app.survey_schedules.
type Schedule struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	SurveyID       uuid.UUID  `db:"survey_id" json:"survey_id"`
	Name           string     `db:"name" json:"name"`
	Frequency      Cadence    `db:"frequency" json:"frequency"`
	CronExpr       string     `db:"cron_expr" json:"cron_expr"`
	AudienceFilter JSONB      `db:"audience_filter" json:"audience_filter"`
	IsActive       bool       `db:"is_active" json:"is_active"`
	NextRunAt      *time.Time `db:"next_run_at" json:"next_run_at,omitempty"`
	LastRunAt      *time.Time `db:"last_run_at" json:"last_run_at,omitempty"`
	CreatedBy      *uuid.UUID `db:"created_by" json:"created_by,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// ScheduleRun describes a computed next distribution time for a survey.
type ScheduleRun struct {
	SurveyID  string    `json:"survey_id"`
	Cadence   Cadence   `json:"cadence"`
	NextRunAt time.Time `json:"next_run_at"`
}

// ComputeNextRun returns the next run timestamp after `from` for a cadence.
// BAT-12-TR pulses fire every Monday at 09:00 tenant-local time by default.
// Monthly instruments fire on the 1st of the month at 09:00.
func ComputeNextRun(from time.Time, cadence Cadence, loc *time.Location) time.Time {
	if loc == nil {
		loc = time.UTC
	}
	base := from.In(loc)
	switch cadence {
	case CadenceWeekly, CadenceBiweekly:
		return nextWeekday(base, time.Monday, 9)
	case CadenceMonthly:
		return nextMonth(base, 1, 9)
	case CadenceQuarterly:
		return nextQuarter(base, 9)
	case CadenceSemiannual:
		return nextSemiannual(base, 9)
	case CadenceAnnual:
		return nextYear(base, 9)
	case CadenceOneTime, CadenceAdHoc:
		return base
	}
	return base
}

func nextWeekday(from time.Time, target time.Weekday, hour int) time.Time {
	days := (int(target) - int(from.Weekday()) + 7) % 7
	if days == 0 && from.Hour() >= hour {
		days = 7
	}
	n := from.AddDate(0, 0, days)
	return time.Date(n.Year(), n.Month(), n.Day(), hour, 0, 0, 0, from.Location())
}

func nextMonth(from time.Time, day, hour int) time.Time {
	n := time.Date(from.Year(), from.Month(), day, hour, 0, 0, 0, from.Location())
	if !n.After(from) {
		n = n.AddDate(0, 1, 0)
	}
	return n
}

func nextQuarter(from time.Time, hour int) time.Time {
	m := from.Month()
	nextQ := time.January
	switch {
	case m < time.April:
		nextQ = time.April
	case m < time.July:
		nextQ = time.July
	case m < time.October:
		nextQ = time.October
	default:
		nextQ = time.January
	}
	year := from.Year()
	if nextQ == time.January {
		year++
	}
	return time.Date(year, nextQ, 1, hour, 0, 0, 0, from.Location())
}

func nextSemiannual(from time.Time, hour int) time.Time {
	if from.Month() < time.July {
		return time.Date(from.Year(), time.July, 1, hour, 0, 0, 0, from.Location())
	}
	return time.Date(from.Year()+1, time.January, 1, hour, 0, 0, 0, from.Location())
}

func nextYear(from time.Time, hour int) time.Time {
	return time.Date(from.Year()+1, time.January, 1, hour, 0, 0, 0, from.Location())
}

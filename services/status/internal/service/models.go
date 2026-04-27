// Package service contains the status page domain logic: components,
// incidents, updates, subscribers and maintenance windows.
package service

import (
	"time"

	"github.com/google/uuid"
)

// Status levels for a component or rolled-up global status.
const (
	StatusOperational   = "operational"
	StatusDegraded      = "degraded"
	StatusPartialOutage = "partial_outage"
	StatusMajorOutage   = "major_outage"
	StatusMaintenance   = "maintenance"
)

// Impact values for incidents.
const (
	ImpactNone     = "none"
	ImpactMinor    = "minor"
	ImpactMajor    = "major"
	ImpactCritical = "critical"
)

// Incident lifecycle states.
const (
	IncStatusInvestigating = "investigating"
	IncStatusIdentified    = "identified"
	IncStatusMonitoring    = "monitoring"
	IncStatusResolved      = "resolved"
	IncStatusPostmortem    = "postmortem"
)

// Component categories.
const (
	CatCore        = "core"
	CatService     = "service"
	CatML          = "ml"
	CatIntegration = "integration"
)

// Component represents a monitored surface on the status page.
type Component struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	Code              string     `db:"code" json:"code"`
	Name              string     `db:"name" json:"name"`
	Description       *string    `db:"description" json:"description,omitempty"`
	Category          string     `db:"category" json:"category"`
	SortOrder         int        `db:"sort_order" json:"sort_order"`
	Status            string     `db:"status" json:"status"`
	HealthcheckURL    *string    `db:"healthcheck_url" json:"healthcheck_url,omitempty"`
	PrometheusJob     *string    `db:"prometheus_job" json:"prometheus_job,omitempty"`
	AutoSyncEnabled   bool       `db:"auto_sync_enabled" json:"auto_sync_enabled"`
	LastCheckedAt     *time.Time `db:"last_checked_at" json:"last_checked_at,omitempty"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`
}

// ComponentPublic is the JSON format exposed on /api/v2/components
// (Atlassian Statuspage compatible subset).
type ComponentPublic struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	Category string `json:"group_id,omitempty"`
}

// DailyRollup holds uptime data for a single component/day.
type DailyRollup struct {
	ComponentID   uuid.UUID `db:"component_id" json:"component_id"`
	Day           time.Time `db:"day" json:"day"`
	TotalProbes   int       `db:"total_probes" json:"total_probes"`
	FailedProbes  int       `db:"failed_probes" json:"failed_probes"`
	P95LatencyMs  *int      `db:"p95_latency_ms" json:"p95_latency_ms,omitempty"`
	IncidentCount int       `db:"incident_count" json:"incident_count"`
}

// Uptime returns the 0..1 ratio of successful probes in this daily bucket.
func (d DailyRollup) Uptime() float64 {
	if d.TotalProbes == 0 {
		return 1.0
	}
	return float64(d.TotalProbes-d.FailedProbes) / float64(d.TotalProbes)
}

// Incident mirrors app.status_incidents.
type Incident struct {
	ID                uuid.UUID   `db:"id" json:"id"`
	Title             string      `db:"title" json:"title"`
	Impact            string      `db:"impact" json:"impact"`
	Status            string      `db:"status" json:"status"`
	StartedAt         time.Time   `db:"started_at" json:"started_at"`
	ResolvedAt        *time.Time  `db:"resolved_at" json:"resolved_at,omitempty"`
	PostmortemURL     *string     `db:"postmortem_url" json:"postmortem_url,omitempty"`
	PostmortemSummary *string     `db:"postmortem_summary" json:"postmortem_summary,omitempty"`
	ComponentIDs      UUIDArray   `db:"component_ids" json:"component_ids"`
	CreatedBy         *string     `db:"created_by" json:"created_by,omitempty"`
	CreatedAt         time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time   `db:"updated_at" json:"updated_at"`
}

// IncidentUpdate represents a single status update line on an incident.
type IncidentUpdate struct {
	ID         uuid.UUID `db:"id" json:"id"`
	IncidentID uuid.UUID `db:"incident_id" json:"incident_id"`
	Status     string    `db:"status" json:"status"`
	Body       string    `db:"body" json:"body"`
	Author     *string   `db:"author" json:"author,omitempty"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

// MaintenanceWindow represents a planned maintenance window.
type MaintenanceWindow struct {
	ID             uuid.UUID `db:"id" json:"id"`
	Title          string    `db:"title" json:"title"`
	Description    string    `db:"description" json:"description"`
	ScheduledStart time.Time `db:"scheduled_start" json:"scheduled_start"`
	ScheduledEnd   time.Time `db:"scheduled_end" json:"scheduled_end"`
	Status         string    `db:"status" json:"status"`
	ComponentIDs   UUIDArray `db:"component_ids" json:"component_ids"`
	CreatedBy      *string   `db:"created_by" json:"created_by,omitempty"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time `db:"updated_at" json:"updated_at"`
}

// Subscriber is one subscription row.
type Subscriber struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	Channel           string     `db:"channel" json:"channel"`
	Target            string     `db:"target" json:"target"`
	ComponentIDs      UUIDArray  `db:"component_ids" json:"component_ids"`
	Confirmed         bool       `db:"confirmed" json:"confirmed"`
	ConfirmToken      *string    `db:"confirm_token" json:"-"`
	UnsubscribeToken  string     `db:"unsubscribe_token" json:"-"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	ConfirmedAt       *time.Time `db:"confirmed_at" json:"confirmed_at,omitempty"`
	LastNotifiedAt    *time.Time `db:"last_notified_at" json:"last_notified_at,omitempty"`
}

// SubscribeRequest is the payload submitted by the public subscribe form.
type SubscribeRequest struct {
	Channel      string      `json:"channel"`
	Target       string      `json:"target"`
	ComponentIDs []uuid.UUID `json:"component_ids,omitempty"`
}

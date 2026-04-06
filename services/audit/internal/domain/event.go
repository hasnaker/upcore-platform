package domain

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ActorType identifies how the action was initiated.
type ActorType string

const (
	ActorTypeUser    ActorType = "user"
	ActorTypeSystem  ActorType = "system"
	ActorTypeService ActorType = "service"
	ActorTypeWebhook ActorType = "webhook"
)

// ResultStatus is the outcome of the audited action.
type ResultStatus string

const (
	ResultSuccess ResultStatus = "success"
	ResultFailure ResultStatus = "failure"
	ResultDenied  ResultStatus = "denied"
)

// Action is a free-form string naming the action. Common values are defined
// here but services may emit any action they want.
const (
	ActionCreate        = "create"
	ActionRead          = "read"
	ActionUpdate        = "update"
	ActionDelete        = "delete"
	ActionExport        = "export"
	ActionLogin         = "login_success"
	ActionLoginFailed   = "login_failure"
	ActionSessionRevoke = "session_revoked"
	ActionRoleAssign    = "role_assigned"
	ActionKVKKAccess    = "kvkk_data_accessed"
)

// Event is the append-only record for every auditable operation.
type Event struct {
	ID            uuid.UUID       `db:"id" json:"id"`
	TenantID      uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	OccurredAt    time.Time       `db:"occurred_at" json:"occurred_at"`
	EventType     string          `db:"event_type" json:"event_type"`
	ActorType     ActorType       `db:"actor_type" json:"actor_type"`
	ActorID       uuid.UUID       `db:"actor_id" json:"actor_id"`
	ActorEmail    string          `db:"actor_email" json:"actor_email,omitempty"`
	ResourceType  string          `db:"resource_type" json:"resource_type"`
	ResourceID    uuid.UUID       `db:"resource_id" json:"resource_id"`
	Service       string          `db:"service" json:"service"`
	Action        string          `db:"action" json:"action"`
	Result        ResultStatus    `db:"result" json:"result"`
	IPAddress     string          `db:"ip_address" json:"ip_address,omitempty"`
	UserAgent     string          `db:"user_agent" json:"user_agent,omitempty"`
	CorrelationID string          `db:"correlation_id" json:"correlation_id,omitempty"`
	Changes       json.RawMessage `db:"changes" json:"changes,omitempty"`
	Metadata      json.RawMessage `db:"metadata" json:"metadata,omitempty"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
}

// Validate ensures required fields are present and enums are known.
func (e *Event) Validate() error {
	if e.TenantID == uuid.Nil {
		return fmt.Errorf("%w: tenant_id required", ErrInvalidInput)
	}
	if e.OccurredAt.IsZero() {
		return fmt.Errorf("%w: occurred_at required", ErrInvalidInput)
	}
	if e.EventType == "" {
		return fmt.Errorf("%w: event_type required", ErrInvalidInput)
	}
	if e.Action == "" {
		return fmt.Errorf("%w: action required", ErrInvalidInput)
	}
	if e.Service == "" {
		return fmt.Errorf("%w: service required", ErrInvalidInput)
	}
	switch e.ActorType {
	case ActorTypeUser, ActorTypeSystem, ActorTypeService, ActorTypeWebhook:
	case "":
		e.ActorType = ActorTypeSystem
	default:
		return fmt.Errorf("%w: actor_type invalid", ErrInvalidInput)
	}
	switch e.Result {
	case ResultSuccess, ResultFailure, ResultDenied:
	case "":
		e.Result = ResultSuccess
	default:
		return fmt.Errorf("%w: result invalid", ErrInvalidInput)
	}
	return nil
}

// Redact returns a copy with PII stripped. Actor email and ip address are
// removed; metadata is preserved. Intended for exports and public APIs.
func (e *Event) Redact() *Event {
	c := *e
	c.ActorEmail = ""
	c.IPAddress = ""
	c.UserAgent = ""
	return &c
}

// QueryFilter defines the parameters supported by the events query API.
type QueryFilter struct {
	TenantID     uuid.UUID
	ActorID      *uuid.UUID
	ResourceType string
	ResourceID   *uuid.UUID
	Service      string
	Action       string
	EventType    string
	Result       string
	From         time.Time
	To           time.Time
}

// LogRequest is the payload accepted by the ingestion HTTP endpoint.
type LogRequest struct {
	OccurredAt    time.Time       `json:"occurred_at"`
	EventType     string          `json:"event_type"`
	ActorType     ActorType       `json:"actor_type"`
	ActorID       uuid.UUID       `json:"actor_id"`
	ActorEmail    string          `json:"actor_email,omitempty"`
	ResourceType  string          `json:"resource_type"`
	ResourceID    uuid.UUID       `json:"resource_id"`
	Service       string          `json:"service"`
	Action        string          `json:"action"`
	Result        ResultStatus    `json:"result"`
	IPAddress     string          `json:"ip_address,omitempty"`
	UserAgent     string          `json:"user_agent,omitempty"`
	CorrelationID string          `json:"correlation_id,omitempty"`
	Changes       json.RawMessage `json:"changes,omitempty"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
}

// ToEvent materialises a LogRequest into a domain Event.
func (r *LogRequest) ToEvent(tenantID uuid.UUID) *Event {
	id := uuid.New()
	if r.OccurredAt.IsZero() {
		r.OccurredAt = time.Now().UTC()
	}
	return &Event{
		ID:            id,
		TenantID:      tenantID,
		OccurredAt:    r.OccurredAt,
		EventType:     r.EventType,
		ActorType:     r.ActorType,
		ActorID:       r.ActorID,
		ActorEmail:    r.ActorEmail,
		ResourceType:  r.ResourceType,
		ResourceID:    r.ResourceID,
		Service:       r.Service,
		Action:        r.Action,
		Result:        r.Result,
		IPAddress:     r.IPAddress,
		UserAgent:     r.UserAgent,
		CorrelationID: r.CorrelationID,
		Changes:       r.Changes,
		Metadata:      r.Metadata,
		CreatedAt:     time.Now().UTC(),
	}
}

// StatsSummary aggregates event counts for monitoring and compliance dashboards.
type StatsSummary struct {
	Total     int            `json:"total"`
	ByAction  map[string]int `json:"by_action"`
	ByService map[string]int `json:"by_service"`
	ByResult  map[string]int `json:"by_result"`
}

// DailyCount reports event counts per day.
type DailyCount struct {
	Day   time.Time `db:"day" json:"day"`
	Count int       `db:"count" json:"count"`
}

package event

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// Event topics published by the leave service.
const (
	TopicRequestSubmitted = "leave.request.submitted.v1"
	TopicRequestApproved  = "leave.request.approved.v1"
	TopicRequestRejected  = "leave.request.rejected.v1"
	TopicRequestCancelled = "leave.request.cancelled.v1"
	TopicBalanceUpdated   = "leave.balance.updated.v1"
	TopicBalanceAccrued   = "leave.balance.accrued.v1"
	TopicBalanceLow       = "leave.balance.low.v1"
)

// Envelope is the canonical event envelope used across Upcore services.
type Envelope struct {
	EventID     string          `json:"event_id"`
	EventType   string          `json:"event_type"`
	OccurredAt  time.Time       `json:"occurred_at"`
	ServiceName string          `json:"service_name"`
	Payload     json.RawMessage `json:"payload"`
}

// Publisher publishes events to a broker.
type Publisher interface {
	Publish(ctx context.Context, topic string, payload any) error
	Close() error
}

// NopPublisher discards events; used when broker is not configured.
type NopPublisher struct {
	log zerolog.Logger
}

// NewNopPublisher creates a no-op publisher.
func NewNopPublisher(log zerolog.Logger) *NopPublisher {
	return &NopPublisher{log: log}
}

// Publish logs the event and returns nil.
func (p *NopPublisher) Publish(ctx context.Context, topic string, payload any) error {
	env, err := buildEnvelope(topic, payload)
	if err != nil {
		return err
	}
	p.log.Info().
		Str("event_id", env.EventID).
		Str("event_type", topic).
		Msg("nop publisher: discarded event")
	_ = ctx
	return nil
}

// Close is a no-op.
func (p *NopPublisher) Close() error { return nil }

// InMemoryPublisher captures published events for testing.
type InMemoryPublisher struct {
	mu     sync.Mutex
	Events []Envelope
}

// NewInMemoryPublisher creates an in-memory publisher.
func NewInMemoryPublisher() *InMemoryPublisher {
	return &InMemoryPublisher{Events: make([]Envelope, 0, 16)}
}

// Publish records the event.
func (p *InMemoryPublisher) Publish(ctx context.Context, topic string, payload any) error {
	env, err := buildEnvelope(topic, payload)
	if err != nil {
		return err
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Events = append(p.Events, env)
	_ = ctx
	return nil
}

// Close is a no-op.
func (p *InMemoryPublisher) Close() error { return nil }

// Snapshot returns a copy of captured events.
func (p *InMemoryPublisher) Snapshot() []Envelope {
	p.mu.Lock()
	defer p.mu.Unlock()
	out := make([]Envelope, len(p.Events))
	copy(out, p.Events)
	return out
}

// Count returns the number of events published for a topic.
func (p *InMemoryPublisher) Count(topic string) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	n := 0
	for _, e := range p.Events {
		if e.EventType == topic {
			n++
		}
	}
	return n
}

func buildEnvelope(topic string, payload any) (Envelope, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return Envelope{}, fmt.Errorf("marshal event payload: %w", err)
	}
	return Envelope{
		EventID:     uuid.NewString(),
		EventType:   topic,
		OccurredAt:  time.Now().UTC(),
		ServiceName: "leave",
		Payload:     raw,
	}, nil
}

// Event payloads =============================================================

// RequestSubmitted is the payload of leave.request.submitted.v1.
type RequestSubmitted struct {
	RequestID   uuid.UUID `json:"request_id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	EmployeeID  uuid.UUID `json:"employee_id"`
	LeaveTypeID uuid.UUID `json:"leave_type_id"`
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
	TotalDays   float64   `json:"total_days"`
	SubmittedAt time.Time `json:"submitted_at"`
}

// RequestApproved is the payload of leave.request.approved.v1.
type RequestApproved struct {
	RequestID    uuid.UUID `json:"request_id"`
	TenantID     uuid.UUID `json:"tenant_id"`
	EmployeeID   uuid.UUID `json:"employee_id"`
	ApproverID   uuid.UUID `json:"approver_id"`
	ApproverRole string    `json:"approver_role"`
	ApprovedAt   time.Time `json:"approved_at"`
	Final        bool      `json:"final"`
}

// RequestRejected is the payload of leave.request.rejected.v1.
type RequestRejected struct {
	RequestID  uuid.UUID `json:"request_id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	EmployeeID uuid.UUID `json:"employee_id"`
	RejectorID uuid.UUID `json:"rejector_id"`
	Reason     string    `json:"reason"`
	RejectedAt time.Time `json:"rejected_at"`
}

// RequestCancelled is the payload of leave.request.cancelled.v1.
type RequestCancelled struct {
	RequestID   uuid.UUID `json:"request_id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	EmployeeID  uuid.UUID `json:"employee_id"`
	CancelledBy uuid.UUID `json:"cancelled_by"`
	CancelledAt time.Time `json:"cancelled_at"`
}

// BalanceUpdated is the payload of leave.balance.updated.v1.
type BalanceUpdated struct {
	TenantID      uuid.UUID `json:"tenant_id"`
	EmployeeID    uuid.UUID `json:"employee_id"`
	LeaveTypeID   uuid.UUID `json:"leave_type_id"`
	Year          int       `json:"year"`
	RemainingDays float64   `json:"remaining_days"`
	UpdatedAt     time.Time `json:"updated_at"`
}

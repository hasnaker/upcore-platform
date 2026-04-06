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

// Event topics published by the tenant service.
const (
	TopicTenantCreated       = "tenant.created.v1"
	TopicTenantUpgraded      = "tenant.upgraded.v1"
	TopicTenantCancelled     = "tenant.cancelled.v1"
	TopicTenantSuspended     = "tenant.suspended.v1"
	TopicTenantDeleted       = "tenant.deleted.v1"
	TopicTenantActivated     = "tenant.activated.v1"
	TopicTenantUsageRecorded = "tenant.usage.recorded.v1"
	TopicTenantAdminInvited  = "tenant.admin_invited.v1"
	TopicSeatLimitReached    = "tenant.seat.limit.reached.v1"
	TopicInvoicePaid         = "tenant.invoice.paid.v1"
	TopicInvoiceFailed       = "tenant.invoice.failed.v1"
)

// Envelope is the canonical event envelope used across Upcore services.
type Envelope struct {
	EventID     string          `json:"event_id"`
	EventType   string          `json:"event_type"`
	OccurredAt  time.Time       `json:"occurred_at"`
	ServiceName string          `json:"service_name"`
	Payload     json.RawMessage `json:"payload"`
}

// Publisher publishes events to a broker (Azure Service Bus, or in-memory for tests).
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
		ServiceName: "tenant",
		Payload:     raw,
	}, nil
}

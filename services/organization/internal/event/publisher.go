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

// Event topics published by the organization service.
const (
	TopicDepartmentCreated    = "department.created.v1"
	TopicDepartmentUpdated    = "department.updated.v1"
	TopicDepartmentMoved      = "department.moved.v1"
	TopicDepartmentDeleted    = "department.deleted.v1"
	TopicPositionCreated      = "position.created.v1"
	TopicPositionUpdated      = "position.updated.v1"
	TopicPositionJDRChanged   = "position.jdr_changed.v1"
	TopicPositionDeleted      = "position.deleted.v1"
	TopicTeamCreated          = "team.created.v1"
	TopicTeamUpdated          = "team.updated.v1"
	TopicTeamMemberAdded      = "team.member.added.v1"
	TopicTeamMemberRemoved    = "team.member.removed.v1"
	TopicReportingChanged     = "reporting.manager_changed.v1"
	TopicHeadcountSnapshotted = "headcount.snapshot_taken.v1"
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

// NopPublisher discards events.
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
		ServiceName: "organization",
		Payload:     raw,
	}, nil
}

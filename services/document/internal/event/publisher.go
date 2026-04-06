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

// Topics published by the document service.
const (
	TopicDocumentUploaded       = "document.uploaded.v1"
	TopicDocumentDownloaded     = "document.downloaded.v1"
	TopicDocumentVersionCreated = "document.version.created.v1"
	TopicDocumentDeleted        = "document.deleted.v1"
	TopicDocumentExpiring       = "document.expiring.v1"
	TopicDocumentExpired        = "document.expired.v1"
	TopicSignatureInitiated     = "document.signature.initiated.v1"
	TopicSignatureCompleted     = "document.signature.completed.v1"
	TopicSignatureRejected      = "document.signature.rejected.v1"
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

// Publish logs and discards the event.
func (p *NopPublisher) Publish(ctx context.Context, topic string, payload any) error {
	env, err := buildEnvelope(topic, payload)
	if err != nil {
		return err
	}
	p.log.Debug().
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

// Count returns events published for a topic.
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
		ServiceName: "document",
		Payload:     raw,
	}, nil
}

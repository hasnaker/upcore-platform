// Package event standardises event publishing for the bordro service.
// Mirrors the contract used by services/employee/internal/event so downstream
// subscribers (notification, audit, reports) see a uniform envelope shape.
package event

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/messaging/azservicebus"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// Topics published by the bordro service.
const (
	TopicPayrollRunCalculated = "bordro.run.calculated.v1"
	TopicPayrollRunApproved   = "bordro.run.approved.v1"
	TopicPayrollRunFinalised  = "bordro.run.finalised.v1"
	TopicSGKXMLGenerated      = "bordro.sgk.xml.generated.v1"
	TopicPeriodLocked         = "bordro.period.locked.v1"
)

// Envelope is the canonical UpCore event envelope.
type Envelope struct {
	EventID     string          `json:"event_id"`
	EventType   string          `json:"event_type"`
	OccurredAt  time.Time       `json:"occurred_at"`
	ServiceName string          `json:"service_name"`
	Payload     json.RawMessage `json:"payload"`
}

// Publisher is the narrow contract the PayrollService depends on.
type Publisher interface {
	Publish(ctx context.Context, topic string, payload any) error
	Close() error
}

// NopPublisher logs + discards events. Used in dev/test or when the broker
// is unreachable.
type NopPublisher struct{ log zerolog.Logger }

// NewNopPublisher constructs a NopPublisher.
func NewNopPublisher(log zerolog.Logger) *NopPublisher { return &NopPublisher{log: log} }

// Publish logs the envelope.
func (p *NopPublisher) Publish(_ context.Context, topic string, payload any) error {
	env, err := buildEnvelope(topic, payload)
	if err != nil {
		return err
	}
	p.log.Info().
		Str("event_id", env.EventID).
		Str("event_type", topic).
		Msg("nop publisher: discarded event")
	return nil
}

// Close is a no-op.
func (p *NopPublisher) Close() error { return nil }

// InMemoryPublisher captures events for tests.
type InMemoryPublisher struct {
	mu     sync.Mutex
	Events []Envelope
}

// NewInMemoryPublisher constructs an InMemoryPublisher.
func NewInMemoryPublisher() *InMemoryPublisher { return &InMemoryPublisher{} }

// Publish records the event.
func (p *InMemoryPublisher) Publish(_ context.Context, topic string, payload any) error {
	env, err := buildEnvelope(topic, payload)
	if err != nil {
		return err
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Events = append(p.Events, env)
	return nil
}

// Close is a no-op.
func (p *InMemoryPublisher) Close() error { return nil }

// Count returns how many events for a given topic.
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

// ServiceBusPublisher publishes to Azure Service Bus.
type ServiceBusPublisher struct {
	client *azservicebus.Client
	sender *azservicebus.Sender
	topic  string
	log    zerolog.Logger
}

// NewServiceBusPublisher constructs a publisher. connStr empty → caller
// should fall back to NopPublisher; the function returns an error.
func NewServiceBusPublisher(ctx context.Context, connStr, topic string, log zerolog.Logger) (*ServiceBusPublisher, error) {
	if strings.TrimSpace(connStr) == "" {
		return nil, fmt.Errorf("service bus: connection string boş")
	}
	if strings.TrimSpace(topic) == "" {
		return nil, fmt.Errorf("service bus: topic adı boş")
	}
	client, err := azservicebus.NewClientFromConnectionString(connStr, nil)
	if err != nil {
		return nil, fmt.Errorf("service bus client: %w", err)
	}
	sender, err := client.NewSender(topic, nil)
	if err != nil {
		_ = client.Close(ctx)
		return nil, fmt.Errorf("service bus sender: %w", err)
	}
	return &ServiceBusPublisher{client: client, sender: sender, topic: topic, log: log}, nil
}

// Publish sends one event with 5s timeout.
func (p *ServiceBusPublisher) Publish(ctx context.Context, topic string, payload any) error {
	env, err := buildEnvelope(topic, payload)
	if err != nil {
		return err
	}
	body, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("marshal envelope: %w", err)
	}
	msg := &azservicebus.Message{
		Body:        body,
		ContentType: ptrString("application/json"),
		MessageID:   ptrString(env.EventID),
		Subject:     ptrString(env.EventType),
		ApplicationProperties: map[string]any{
			"event_type":   env.EventType,
			"service_name": env.ServiceName,
			"occurred_at":  env.OccurredAt.Format(time.RFC3339),
		},
	}
	sendCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := p.sender.SendMessage(sendCtx, msg, nil); err != nil {
		p.log.Error().Err(err).Str("event_type", env.EventType).Msg("service bus send failed")
		return fmt.Errorf("service bus send: %w", err)
	}
	return nil
}

// Close releases the sender + client.
func (p *ServiceBusPublisher) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if p.sender != nil {
		_ = p.sender.Close(ctx)
	}
	if p.client != nil {
		return p.client.Close(ctx)
	}
	return nil
}

// ---------------------------------------------------------------------------

func buildEnvelope(topic string, payload any) (Envelope, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return Envelope{}, fmt.Errorf("marshal payload: %w", err)
	}
	return Envelope{
		EventID:     uuid.NewString(),
		EventType:   topic,
		OccurredAt:  time.Now().UTC(),
		ServiceName: "bordro",
		Payload:     raw,
	}, nil
}

func ptrString(s string) *string { return &s }

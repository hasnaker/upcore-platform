// Package event publishes performance-domain events to Service Bus.
package event

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/messaging/azservicebus"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// Topics emitted by the performance service.
const (
	TopicCycleAdvanced      = "performance.cycle.advanced.v1"
	TopicGoalCreated        = "performance.goal.created.v1"
	TopicGoalUpdated        = "performance.goal.updated.v1"
	TopicOKRCreated         = "performance.okr.created.v1"
	TopicOKRUpdated         = "performance.okr.updated.v1"
	TopicOKRKRUpdated       = "performance.okr.key_result.updated.v1"
	TopicReviewSubmitted    = "performance.review.submitted.v1"
	TopicReviewFinalised    = "performance.review.finalised.v1"
	TopicNineBoxCalibrated  = "performance.nine_box.calibrated.v1"
	TopicCompetencyUpserted = "performance.competency.upserted.v1"
)

// Envelope is the canonical UpCore event envelope.
type Envelope struct {
	EventID     string          `json:"event_id"`
	EventType   string          `json:"event_type"`
	OccurredAt  time.Time       `json:"occurred_at"`
	ServiceName string          `json:"service_name"`
	Payload     json.RawMessage `json:"payload"`
}

// Publisher is the narrow contract callers depend on.
type Publisher interface {
	Publish(ctx context.Context, topic string, payload any) error
	Close() error
}

// NopPublisher logs + discards — dev/test or broker-down fallback.
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

// ServiceBusPublisher publishes to Azure Service Bus.
type ServiceBusPublisher struct {
	client *azservicebus.Client
	sender *azservicebus.Sender
	topic  string
	log    zerolog.Logger
}

// NewServiceBusPublisher wires an Azure Service Bus sender.
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

func buildEnvelope(topic string, payload any) (Envelope, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return Envelope{}, fmt.Errorf("marshal payload: %w", err)
	}
	return Envelope{
		EventID:     uuid.NewString(),
		EventType:   topic,
		OccurredAt:  time.Now().UTC(),
		ServiceName: "performance",
		Payload:     raw,
	}, nil
}

func ptrString(s string) *string { return &s }

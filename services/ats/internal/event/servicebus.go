package event

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/messaging/azservicebus"
	"github.com/rs/zerolog"
)

// ServiceBusPublisher publishes events to an Azure Service Bus topic.
//
// AZ_SERVICE_BUS_CONNECTION_STRING + SERVICE_BUS_TOPIC env'i set edildiğinde
// main.go bunu seçer; aksi halde NopPublisher fallback.
type ServiceBusPublisher struct {
	client *azservicebus.Client
	sender *azservicebus.Sender
	topic  string
	log    zerolog.Logger
}

// NewServiceBusPublisher builds a publisher from an Azure connection string.
func NewServiceBusPublisher(ctx context.Context, connStr, topic string, log zerolog.Logger) (*ServiceBusPublisher, error) {
	if strings.TrimSpace(connStr) == "" {
		return nil, fmt.Errorf("service bus: connection string boş")
	}
	if strings.TrimSpace(topic) == "" {
		return nil, fmt.Errorf("service bus: topic boş")
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

// Publish sends one event. MessageID = EventID (Service Bus duplicate detection).
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

func ptrString(s string) *string { return &s }

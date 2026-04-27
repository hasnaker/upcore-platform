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
// Kullanım: `AZURE_SERVICE_BUS_CONNECTION_STRING` ve `AZURE_SERVICE_BUS_TOPIC`
// env değişkenleri set edilirse `NewServiceBusPublisher` çağrılır; aksi halde
// servis `NopPublisher` ile başlatılır ve sadece log basar.
//
// Tek bir topic'e tüm event tipleri gönderilir; subscriber'lar filter/rule
// kullanarak ilgili event_type'ı dinler (Service Bus SQL filter).
type ServiceBusPublisher struct {
	client *azservicebus.Client
	sender *azservicebus.Sender
	topic  string
	log    zerolog.Logger
}

// NewServiceBusPublisher builds a publisher from a connection string.
// connStr örneği: "Endpoint=sb://foo.servicebus.windows.net/;SharedAccessKeyName=K;SharedAccessKey=...".
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
	return &ServiceBusPublisher{
		client: client,
		sender: sender,
		topic:  topic,
		log:    log,
	}, nil
}

// Publish sends a single event to the Service Bus topic. The envelope is
// identical to the NopPublisher's (same buildEnvelope helper).
// MessageID = envelope.EventID (idempotency + duplicate detection).
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
		Body:          body,
		ContentType:   ptrString("application/json"),
		MessageID:     ptrString(env.EventID),
		Subject:       ptrString(env.EventType),
		ApplicationProperties: map[string]any{
			"event_type":   env.EventType,
			"service_name": env.ServiceName,
			"occurred_at":  env.OccurredAt.Format(time.RFC3339),
		},
	}
	// Bounded timeout so callers never block indefinitely on a broker hiccup.
	sendCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := p.sender.SendMessage(sendCtx, msg, nil); err != nil {
		p.log.Error().
			Err(err).
			Str("event_type", env.EventType).
			Str("event_id", env.EventID).
			Msg("service bus send failed")
		return fmt.Errorf("service bus send: %w", err)
	}
	p.log.Debug().
		Str("event_id", env.EventID).
		Str("event_type", env.EventType).
		Str("topic", p.topic).
		Msg("event published")
	return nil
}

// Close releases the sender + underlying client.
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

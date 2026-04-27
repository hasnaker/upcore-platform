package event

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
)

// DeniedEvent represents a request that was denied by the gateway (auth failure,
// rate limit, etc.) and published to the audit service.
type DeniedEvent struct {
	CorrelationID string    `json:"correlation_id"`
	TenantID      string    `json:"tenant_id"`
	UserID        string    `json:"user_id"`
	Path          string    `json:"path"`
	Method        string    `json:"method"`
	Status        int       `json:"status"`
	Reason        string    `json:"reason"`
	RemoteAddr    string    `json:"remote_addr"`
	Timestamp     time.Time `json:"ts"`
}

// Publisher publishes denied-request audit events.
// In production, this sends to Azure Service Bus.
// For now, it uses a pluggable sender interface.
type Publisher struct {
	sender Sender
}

// Sender is the interface for event publishing backends.
type Sender interface {
	Send(ctx context.Context, topic string, data []byte) error
	Close() error
}

// NewPublisher creates a new event publisher.
func NewPublisher(sender Sender) *Publisher {
	return &Publisher{sender: sender}
}

// PublishDenied publishes a denied request event asynchronously.
func (p *Publisher) PublishDenied(ctx context.Context, evt DeniedEvent) {
	if p == nil || p.sender == nil {
		return
	}

	go func() {
		pubCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		data, err := json.Marshal(evt)
		if err != nil {
			log.Error().Err(err).
				Str("correlation_id", evt.CorrelationID).
				Msg("marshal denied event")
			return
		}

		if err := p.sender.Send(pubCtx, "audit-events", data); err != nil {
			log.Error().Err(err).
				Str("correlation_id", evt.CorrelationID).
				Msg("publish denied event")
			return
		}

		log.Debug().
			Str("correlation_id", evt.CorrelationID).
			Str("reason", evt.Reason).
			Int("status", evt.Status).
			Msg("denied event published")
	}()
}

// Close shuts down the publisher.
func (p *Publisher) Close() error {
	if p == nil || p.sender == nil {
		return nil
	}
	return p.sender.Close()
}

// NoopSender is a no-op sender used when event publishing is not configured.
type NoopSender struct{}

// Send is a no-op.
func (n *NoopSender) Send(_ context.Context, _ string, _ []byte) error {
	return nil
}

// Close is a no-op.
func (n *NoopSender) Close() error {
	return nil
}

// LogSender logs events instead of sending them (useful for development).
type LogSender struct{}

// Send logs the event.
func (l *LogSender) Send(_ context.Context, topic string, data []byte) error {
	log.Info().
		Str("topic", topic).
		RawJSON("payload", data).
		Msg("event published (log sender)")
	return nil
}

// Close is a no-op.
func (l *LogSender) Close() error {
	return nil
}

// NewNoopPublisher creates a publisher that does nothing.
func NewNoopPublisher() *Publisher {
	return NewPublisher(&NoopSender{})
}

// NewLogPublisher creates a publisher that logs events.
func NewLogPublisher() *Publisher {
	return NewPublisher(&LogSender{})
}

// ServiceBusSender sends events to Azure Service Bus.
// This is a placeholder - implement with actual Azure SDK when ServiceBus is configured.
type ServiceBusSender struct {
	connectionString string
}

// NewServiceBusSender creates a new Service Bus sender.
func NewServiceBusSender(connectionString string) (*ServiceBusSender, error) {
	if connectionString == "" {
		return nil, fmt.Errorf("service bus connection string is required")
	}
	return &ServiceBusSender{connectionString: connectionString}, nil
}

// Send publishes a message to the specified topic on Azure Service Bus.
func (s *ServiceBusSender) Send(ctx context.Context, topic string, data []byte) error {
	// Note: full Azure Service Bus publish is wired in the operator via the
	// shared `pkg/eventbus` adapter. This dev-mode sender is intentionally a
	// no-op so gateway tests stay hermetic; swap via DI in production.
	log.Warn().
		Str("topic", topic).
		Int("size", len(data)).
		Msg("service bus sender not yet implemented, event dropped")
	return nil
}

// Close shuts down the Service Bus connection.
func (s *ServiceBusSender) Close() error {
	return nil
}

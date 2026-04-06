package event

import (
	"context"
	"encoding/json"

	"github.com/rs/zerolog"
)

// Handler processes an incoming event.
type Handler func(ctx context.Context, env Envelope) error

// Subscriber subscribes to events from a broker.
type Subscriber interface {
	Subscribe(ctx context.Context, topic string, handler Handler) error
	Close() error
}

// NopSubscriber is a no-op subscriber used when Service Bus is unavailable.
type NopSubscriber struct {
	log zerolog.Logger
}

// NewNopSubscriber creates a no-op subscriber.
func NewNopSubscriber(log zerolog.Logger) *NopSubscriber {
	return &NopSubscriber{log: log}
}

// Subscribe logs the subscription and returns nil.
func (s *NopSubscriber) Subscribe(_ context.Context, topic string, _ Handler) error {
	s.log.Info().Str("topic", topic).Msg("nop subscriber: registered handler (no-op)")
	return nil
}

// Close is a no-op.
func (s *NopSubscriber) Close() error { return nil }

// DecodePayload unmarshals an event payload into the given type.
func DecodePayload[T any](env Envelope) (T, error) {
	var out T
	if err := json.Unmarshal(env.Payload, &out); err != nil {
		return out, err
	}
	return out, nil
}

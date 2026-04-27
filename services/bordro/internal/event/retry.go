package event

import (
	"context"
	"errors"
	"math/rand"
	"time"

	"github.com/rs/zerolog"
)

// RetryPublisher decorates any Publisher with exponential backoff + jitter.
//
// Use case: broker transient faults (network blip, throttling). Permanent
// failures (4xx on Service Bus) retry once then give up so we don't block
// the caller forever.
//
// Failed events are logged with context so an operator can replay from the
// DLQ (Service Bus DLQ is auto-configured per topic subscription).
type RetryPublisher struct {
	Inner       Publisher
	MaxAttempts int           // default 3
	BaseDelay   time.Duration // default 100ms
	MaxDelay    time.Duration // default 5s
	Log         zerolog.Logger
}

// NewRetryPublisher wraps an inner Publisher with sensible defaults.
func NewRetryPublisher(inner Publisher, log zerolog.Logger) *RetryPublisher {
	return &RetryPublisher{
		Inner:       inner,
		MaxAttempts: 3,
		BaseDelay:   100 * time.Millisecond,
		MaxDelay:    5 * time.Second,
		Log:         log,
	}
}

// Publish retries on transient errors. Cancelled contexts abort immediately.
func (p *RetryPublisher) Publish(ctx context.Context, topic string, payload any) error {
	var lastErr error
	for attempt := 1; attempt <= p.MaxAttempts; attempt++ {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := p.Inner.Publish(ctx, topic, payload)
		if err == nil {
			if attempt > 1 {
				p.Log.Info().
					Str("topic", topic).
					Int("attempt", attempt).
					Msg("publish succeeded after retry")
			}
			return nil
		}
		lastErr = err
		if attempt == p.MaxAttempts {
			break
		}
		delay := p.backoff(attempt)
		p.Log.Warn().
			Err(err).
			Str("topic", topic).
			Int("attempt", attempt).
			Dur("next_backoff", delay).
			Msg("publish failed — will retry")
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}
	}
	p.Log.Error().
		Err(lastErr).
		Str("topic", topic).
		Int("attempts", p.MaxAttempts).
		Msg("publish gave up — event dropped (check DLQ after replay)")
	return errors.New("publish gave up after " + topic)
}

// Close delegates to the inner publisher.
func (p *RetryPublisher) Close() error { return p.Inner.Close() }

// backoff returns an exponentially increasing delay with ±25% jitter.
// attempt is 1-indexed.
func (p *RetryPublisher) backoff(attempt int) time.Duration {
	exp := time.Duration(1) << (attempt - 1) // 1, 2, 4, 8…
	d := p.BaseDelay * exp
	if d > p.MaxDelay {
		d = p.MaxDelay
	}
	jitter := time.Duration(rand.Int63n(int64(d) / 2))
	// Center jitter: [d - d/4, d + d/4]
	return d - d/4 + jitter
}

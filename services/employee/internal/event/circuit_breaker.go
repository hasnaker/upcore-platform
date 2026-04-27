package event

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

// CircuitState enumerates the breaker states.
type CircuitState int

const (
	// StateClosed — requests pass through. Default.
	StateClosed CircuitState = iota
	// StateOpen — requests rejected immediately (fail-fast) until cool-down.
	StateOpen
	// StateHalfOpen — a single probe request is allowed to test recovery.
	StateHalfOpen
)

func (s CircuitState) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	}
	return "unknown"
}

// ErrCircuitOpen is returned when the breaker is open.
var ErrCircuitOpen = errors.New("circuit breaker open")

// CircuitBreakerPublisher decorates any Publisher with a classic circuit
// breaker. When N consecutive failures happen within a rolling window, the
// breaker trips to OPEN and fails fast for CoolDown duration. After that it
// enters HALF-OPEN and lets ONE probe through; success → CLOSED, failure →
// back to OPEN with a fresh cool-down.
//
// Together with RetryPublisher + OutboxDispatcher this gives us the full
// SRE trio: retry for transient faults, circuit breaker for systemic
// outages (so we don't hammer a dead broker), outbox for durability.
type CircuitBreakerPublisher struct {
	Inner        Publisher
	FailureLimit int           // consecutive failures to trip
	CoolDown     time.Duration // how long to stay OPEN before HALF-OPEN
	Log          zerolog.Logger

	mu        sync.Mutex
	state     CircuitState
	failures  int
	openedAt  time.Time
}

// NewCircuitBreakerPublisher wires sensible defaults (5 fails / 30s cool-down).
func NewCircuitBreakerPublisher(inner Publisher, log zerolog.Logger) *CircuitBreakerPublisher {
	return &CircuitBreakerPublisher{
		Inner:        inner,
		FailureLimit: 5,
		CoolDown:     30 * time.Second,
		Log:          log,
	}
}

// Publish respects the current circuit state.
func (cb *CircuitBreakerPublisher) Publish(ctx context.Context, topic string, payload any) error {
	if !cb.allow() {
		cb.Log.Warn().
			Str("topic", topic).
			Str("state", cb.State().String()).
			Msg("circuit breaker rejected (open)")
		return ErrCircuitOpen
	}
	err := cb.Inner.Publish(ctx, topic, payload)
	cb.record(err)
	return err
}

// Close delegates to the inner publisher.
func (cb *CircuitBreakerPublisher) Close() error { return cb.Inner.Close() }

// State returns the current state (thread-safe).
func (cb *CircuitBreakerPublisher) State() CircuitState {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state
}

// allow returns true when a request may proceed. Transitions OPEN → HALF-OPEN
// after CoolDown has elapsed.
func (cb *CircuitBreakerPublisher) allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	switch cb.state {
	case StateClosed, StateHalfOpen:
		return true
	case StateOpen:
		if time.Since(cb.openedAt) >= cb.CoolDown {
			cb.state = StateHalfOpen
			cb.Log.Info().Msg("circuit breaker → half-open (probe allowed)")
			return true
		}
		return false
	}
	return true
}

// record updates state based on the most recent attempt's outcome.
func (cb *CircuitBreakerPublisher) record(err error) {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	if err == nil {
		// Success resets all counters.
		if cb.state != StateClosed {
			cb.Log.Info().Str("prev_state", cb.state.String()).Msg("circuit breaker → closed")
		}
		cb.state = StateClosed
		cb.failures = 0
		return
	}
	cb.failures++
	if cb.state == StateHalfOpen {
		// Probe failed → trip open again.
		cb.trip()
		return
	}
	if cb.failures >= cb.FailureLimit {
		cb.trip()
	}
}

// trip moves the breaker into OPEN state (must hold mu).
func (cb *CircuitBreakerPublisher) trip() {
	cb.state = StateOpen
	cb.openedAt = time.Now()
	cb.Log.Error().
		Int("failure_limit", cb.FailureLimit).
		Dur("cool_down", cb.CoolDown).
		Msg("circuit breaker TRIPPED OPEN — fast-failing until cool-down elapses")
}

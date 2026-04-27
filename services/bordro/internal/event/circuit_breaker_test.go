package event

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

func newQuietCB(inner Publisher) *CircuitBreakerPublisher {
	return &CircuitBreakerPublisher{
		Inner:        inner,
		FailureLimit: 3,
		CoolDown:     50 * time.Millisecond,
		Log:          zerolog.New(io.Discard),
	}
}

// alwaysFailing returns the given error on every Publish.
type alwaysFailing struct{ err error }

func (a *alwaysFailing) Publish(_ context.Context, _ string, _ any) error { return a.err }
func (a *alwaysFailing) Close() error                                     { return nil }

func TestCircuitBreaker_TripsAfterFailureLimit(t *testing.T) {
	inner := &alwaysFailing{err: errors.New("broker down")}
	cb := newQuietCB(inner)
	ctx := context.Background()

	// First 3 attempts return the inner error, incrementing failures.
	for i := 0; i < 3; i++ {
		if err := cb.Publish(ctx, "t", nil); err == nil {
			t.Fatalf("expected failure on attempt %d", i+1)
		}
	}
	if cb.State() != StateOpen {
		t.Errorf("expected OPEN after 3 failures, got %s", cb.State())
	}

	// 4th attempt should fail fast (ErrCircuitOpen).
	err := cb.Publish(ctx, "t", nil)
	if !errors.Is(err, ErrCircuitOpen) {
		t.Errorf("expected ErrCircuitOpen, got %v", err)
	}
}

func TestCircuitBreaker_HalfOpenProbeSucceeds(t *testing.T) {
	// Controllable inner — starts failing, then recovers.
	inner := &alwaysFailing{err: errors.New("broker down")}
	cb := newQuietCB(inner)
	ctx := context.Background()

	// Trip open.
	for i := 0; i < 3; i++ {
		_ = cb.Publish(ctx, "t", nil)
	}
	if cb.State() != StateOpen {
		t.Fatal("expected open")
	}

	// Wait past cool-down.
	time.Sleep(60 * time.Millisecond)

	// Recover inner.
	inner.err = nil
	// Probe should pass, state → closed.
	if err := cb.Publish(ctx, "t", nil); err != nil {
		t.Fatalf("probe failed: %v", err)
	}
	if cb.State() != StateClosed {
		t.Errorf("expected CLOSED after successful probe, got %s", cb.State())
	}
}

func TestCircuitBreaker_HalfOpenProbeFails(t *testing.T) {
	inner := &alwaysFailing{err: errors.New("still down")}
	cb := newQuietCB(inner)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		_ = cb.Publish(ctx, "t", nil)
	}
	time.Sleep(60 * time.Millisecond) // cool-down elapsed

	// Probe attempt — should fail and re-open.
	err := cb.Publish(ctx, "t", nil)
	if err == nil {
		t.Fatal("expected failure")
	}
	if errors.Is(err, ErrCircuitOpen) {
		t.Fatalf("expected the underlying error on half-open probe, got %v", err)
	}
	if cb.State() != StateOpen {
		t.Errorf("expected re-OPEN after failed probe, got %s", cb.State())
	}
}

func TestCircuitBreaker_SuccessResetsFailures(t *testing.T) {
	flaky := &flakyPublisher{failsLeft: 2}
	cb := newQuietCB(flaky)
	ctx := context.Background()

	_ = cb.Publish(ctx, "t", nil) // fail 1
	_ = cb.Publish(ctx, "t", nil) // fail 2 (limit is 3)
	// Now flaky is ready to succeed.
	if err := cb.Publish(ctx, "t", nil); err != nil {
		t.Fatalf("unexpected failure: %v", err)
	}
	if cb.State() != StateClosed {
		t.Errorf("expected CLOSED after success, got %s", cb.State())
	}
}

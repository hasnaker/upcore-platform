package event

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

// flakyPublisher fails the first N attempts, then succeeds.
type flakyPublisher struct {
	failsLeft int
	calls     int
}

func (f *flakyPublisher) Publish(_ context.Context, _ string, _ any) error {
	f.calls++
	if f.failsLeft > 0 {
		f.failsLeft--
		return errors.New("transient")
	}
	return nil
}
func (f *flakyPublisher) Close() error { return nil }

func newQuietRetry(inner Publisher) *RetryPublisher {
	return &RetryPublisher{
		Inner:       inner,
		MaxAttempts: 3,
		BaseDelay:   1 * time.Millisecond,
		MaxDelay:    5 * time.Millisecond,
		Log:         zerolog.New(io.Discard),
	}
}

func TestRetryPublisher_SucceedsAfterRetries(t *testing.T) {
	inner := &flakyPublisher{failsLeft: 2}
	rp := newQuietRetry(inner)
	if err := rp.Publish(context.Background(), "test.topic", map[string]any{"x": 1}); err != nil {
		t.Fatalf("expected success after retries, got %v", err)
	}
	if inner.calls != 3 {
		t.Errorf("want 3 attempts, got %d", inner.calls)
	}
}

func TestRetryPublisher_GivesUpAfterMaxAttempts(t *testing.T) {
	inner := &flakyPublisher{failsLeft: 10}
	rp := newQuietRetry(inner)
	if err := rp.Publish(context.Background(), "test.topic", nil); err == nil {
		t.Fatal("expected terminal failure")
	}
	if inner.calls != 3 {
		t.Errorf("want 3 attempts, got %d", inner.calls)
	}
}

func TestRetryPublisher_RespectsContextCancel(t *testing.T) {
	inner := &flakyPublisher{failsLeft: 10}
	rp := newQuietRetry(inner)
	rp.BaseDelay = 50 * time.Millisecond
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // immediately
	if err := rp.Publish(ctx, "test.topic", nil); err == nil {
		t.Fatal("expected context cancellation error")
	}
}

func TestRetryPublisher_SuccessOnFirstAttempt(t *testing.T) {
	inner := &flakyPublisher{failsLeft: 0}
	rp := newQuietRetry(inner)
	if err := rp.Publish(context.Background(), "test.topic", nil); err != nil {
		t.Fatalf("got %v", err)
	}
	if inner.calls != 1 {
		t.Errorf("want 1 call, got %d", inner.calls)
	}
}

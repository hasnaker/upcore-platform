package event

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// captureSender records all sent events.
type captureSender struct {
	mu       sync.Mutex
	messages [][]byte
	topics   []string
}

func (c *captureSender) Send(_ context.Context, topic string, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.topics = append(c.topics, topic)
	c.messages = append(c.messages, data)
	return nil
}

func (c *captureSender) Close() error {
	return nil
}

func (c *captureSender) Count() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.messages)
}

func TestPublisher_PublishDenied(t *testing.T) {
	sender := &captureSender{}
	pub := NewPublisher(sender)

	evt := DeniedEvent{
		CorrelationID: "test-correlation",
		TenantID:      "tenant-123",
		UserID:        "user-456",
		Path:          "/api/v1/test",
		Method:        "GET",
		Status:        429,
		Reason:        "rate_limit_exceeded",
		RemoteAddr:    "192.168.1.1",
		Timestamp:     time.Now(),
	}

	pub.PublishDenied(context.Background(), evt)

	// Wait for async publish
	time.Sleep(100 * time.Millisecond)

	assert.Equal(t, 1, sender.Count())
}

func TestPublisher_NilPublisher(t *testing.T) {
	var pub *Publisher
	// Should not panic
	pub.PublishDenied(context.Background(), DeniedEvent{})
}

func TestPublisher_NilSender(t *testing.T) {
	pub := &Publisher{sender: nil}
	// Should not panic
	pub.PublishDenied(context.Background(), DeniedEvent{})
}

func TestNoopPublisher(t *testing.T) {
	pub := NewNoopPublisher()
	require.NotNil(t, pub)
	assert.NoError(t, pub.Close())
}

func TestLogPublisher(t *testing.T) {
	pub := NewLogPublisher()
	require.NotNil(t, pub)

	pub.PublishDenied(context.Background(), DeniedEvent{
		CorrelationID: "test",
		Status:        401,
	})

	// Wait for async publish
	time.Sleep(100 * time.Millisecond)
	assert.NoError(t, pub.Close())
}

func TestNoopSender(t *testing.T) {
	s := &NoopSender{}
	assert.NoError(t, s.Send(context.Background(), "test", []byte("data")))
	assert.NoError(t, s.Close())
}

func TestLogSender(t *testing.T) {
	s := &LogSender{}
	assert.NoError(t, s.Send(context.Background(), "test", []byte(`{"key":"value"}`)))
	assert.NoError(t, s.Close())
}

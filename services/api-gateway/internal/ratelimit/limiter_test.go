package ratelimit

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockStore is an in-memory rate limit store for testing.
type mockStore struct {
	mu      sync.Mutex
	counts  map[string]int
	failAll bool
}

func newMockStore() *mockStore {
	return &mockStore{counts: make(map[string]int)}
}

func (m *mockStore) Incr(_ context.Context, key string, _ int) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.failAll {
		return 0, errors.New("redis down")
	}
	m.counts[key]++
	return m.counts[key], nil
}

func (m *mockStore) Reset(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.counts, key)
}

func (m *mockStore) setFail(v bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.failAll = v
}

func TestLimiter_Allow_WithinLimit(t *testing.T) {
	store := newMockStore()
	limiter := NewLimiter(store, 60)

	ctx := context.Background()
	for i := 0; i < 100; i++ {
		result, err := limiter.Allow(ctx, "test-key", 100)
		require.NoError(t, err)
		assert.True(t, result.Allowed)
		assert.Equal(t, i+1, result.Current)
		assert.Equal(t, 100, result.Limit)
		assert.Equal(t, 100-(i+1), result.Remaining)
	}
}

func TestLimiter_Allow_ExceedLimit(t *testing.T) {
	store := newMockStore()
	limiter := NewLimiter(store, 60)

	ctx := context.Background()

	// Exhaust the limit
	for i := 0; i < 100; i++ {
		result, err := limiter.Allow(ctx, "test-key", 100)
		require.NoError(t, err)
		assert.True(t, result.Allowed)
	}

	// Next request should be denied
	result, err := limiter.Allow(ctx, "test-key", 100)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
	assert.Equal(t, 101, result.Current)
	assert.Equal(t, 0, result.Remaining)
}

func TestLimiter_Allow_ZeroLimit(t *testing.T) {
	store := newMockStore()
	limiter := NewLimiter(store, 60)

	ctx := context.Background()
	result, err := limiter.Allow(ctx, "test-key", 0)
	require.NoError(t, err)
	assert.True(t, result.Allowed)
}

func TestLimiter_Allow_NegativeLimit(t *testing.T) {
	store := newMockStore()
	limiter := NewLimiter(store, 60)

	ctx := context.Background()
	result, err := limiter.Allow(ctx, "test-key", -1)
	require.NoError(t, err)
	assert.True(t, result.Allowed)
}

func TestLimiter_Allow_DifferentKeys(t *testing.T) {
	store := newMockStore()
	limiter := NewLimiter(store, 60)

	ctx := context.Background()

	// Each key has its own counter
	result1, err := limiter.Allow(ctx, "key-1", 1)
	require.NoError(t, err)
	assert.True(t, result1.Allowed)

	result2, err := limiter.Allow(ctx, "key-2", 1)
	require.NoError(t, err)
	assert.True(t, result2.Allowed)

	// key-1 should now be exhausted
	result3, err := limiter.Allow(ctx, "key-1", 1)
	require.NoError(t, err)
	assert.False(t, result3.Allowed)
}

func TestUserKey(t *testing.T) {
	key := UserKey("tenant-1", "user-1")
	assert.Equal(t, "rl:user:tenant-1:user-1", key)
}

func TestTenantKey(t *testing.T) {
	key := TenantKey("tenant-1")
	assert.Equal(t, "rl:tenant:tenant-1", key)
}

// TestLimiter_FailClosed_OnRedisError verifies that fail-closed mode returns
// a "degraded" source with Allowed=false when the store errors.
func TestLimiter_FailClosed_OnRedisError(t *testing.T) {
	store := newMockStore()
	store.setFail(true)
	limiter := NewLimiterWithMode(store, 60, LimiterOptions{
		Mode:                ModeFailClosed,
		BreakerFailsToOpen:  3,
		BreakerOpenDuration: 50 * time.Millisecond,
	})

	ctx := context.Background()
	result, err := limiter.Allow(ctx, "k", 10)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
	assert.Equal(t, "degraded", result.Source)
}

// TestLimiter_BreakerOpensAfterThreshold verifies the breaker trips after N
// consecutive failures and short-circuits subsequent calls.
func TestLimiter_BreakerOpensAfterThreshold(t *testing.T) {
	store := newMockStore()
	store.setFail(true)
	limiter := NewLimiterWithMode(store, 60, LimiterOptions{
		Mode:                ModeFailClosed,
		BreakerFailsToOpen:  3,
		BreakerOpenDuration: 100 * time.Millisecond,
	})

	ctx := context.Background()
	for i := 0; i < 3; i++ {
		_, _ = limiter.Allow(ctx, "k", 10)
	}
	_, _, open := limiter.Metrics()
	assert.Equal(t, int64(1), open, "breaker should be open after threshold")

	// Wait for breaker to allow a trial.
	time.Sleep(120 * time.Millisecond)
	store.setFail(false)
	result, err := limiter.Allow(ctx, "k", 10)
	require.NoError(t, err)
	assert.True(t, result.Allowed)
	assert.Equal(t, "redis", result.Source)
}

// TestLimiter_FailOpenLocal_TokenBucket verifies per-node fallback limits
// requests when Redis is down.
func TestLimiter_FailOpenLocal_TokenBucket(t *testing.T) {
	store := newMockStore()
	store.setFail(true)
	limiter := NewLimiterWithMode(store, 60, LimiterOptions{
		Mode:                ModeFailOpenLocal,
		BreakerFailsToOpen:  1,
		BreakerOpenDuration: time.Second,
	})

	ctx := context.Background()

	// Capacity = 3. First 3 must pass, then deny.
	for i := 0; i < 3; i++ {
		result, err := limiter.Allow(ctx, "bucket-k", 3)
		require.NoError(t, err)
		assert.True(t, result.Allowed, "call %d should be allowed by local bucket", i)
		assert.Equal(t, "local", result.Source)
	}
	result, err := limiter.Allow(ctx, "bucket-k", 3)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
}

// TestLimiter_ConcurrentFailClosed exercises the breaker under concurrent
// failures to catch data races.
func TestLimiter_ConcurrentFailClosed(t *testing.T) {
	store := newMockStore()
	store.setFail(true)
	limiter := NewLimiterWithMode(store, 60, LimiterOptions{
		Mode:                ModeFailClosed,
		BreakerFailsToOpen:  5,
		BreakerOpenDuration: time.Second,
	})

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = limiter.Allow(context.Background(), "k", 100)
		}()
	}
	wg.Wait()
	// No assertion on exact counts — this test is a race guard.
}

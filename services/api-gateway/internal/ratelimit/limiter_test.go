package ratelimit

import (
	"context"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockStore is an in-memory rate limit store for testing.
type mockStore struct {
	mu     sync.Mutex
	counts map[string]int
}

func newMockStore() *mockStore {
	return &mockStore{counts: make(map[string]int)}
}

func (m *mockStore) Incr(_ context.Context, key string, _ int) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.counts[key]++
	return m.counts[key], nil
}

func (m *mockStore) Reset(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.counts, key)
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

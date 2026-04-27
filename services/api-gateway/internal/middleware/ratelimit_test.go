package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/api-gateway/internal/ratelimit"
)

// mockStore is an in-memory rate limit store for testing.
type mockStore struct {
	mu     sync.Mutex
	counts map[string]int
	// When failAll is true, every Incr returns an error (Redis down simulation).
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

func (m *mockStore) setFail(v bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.failAll = v
}

func TestRateLimitMiddleware_AllowsWithinLimit(t *testing.T) {
	store := newMockStore()
	limiter := ratelimit.NewLimiter(store, 60)
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{
		PerUser:   100,
		PerTenant: 1000,
	})

	handler := RateLimitMiddleware(limiter, policyStore)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
	ctx = context.WithValue(ctx, userIDKey{}, "user-1")
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "100", rec.Header().Get("X-RateLimit-Limit"))
	assert.Equal(t, "99", rec.Header().Get("X-RateLimit-Remaining"))
}

func TestRateLimitMiddleware_DeniesOverLimit(t *testing.T) {
	store := newMockStore()
	limiter := ratelimit.NewLimiter(store, 60)
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{
		PerUser:   2,
		PerTenant: 1000,
	})

	handler := RateLimitMiddleware(limiter, policyStore)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// Make requests up to the limit
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
		ctx = context.WithValue(ctx, userIDKey{}, "user-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		require.Equal(t, http.StatusOK, rec.Code)
	}

	// Next request should be denied
	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
	ctx = context.WithValue(ctx, userIDKey{}, "user-1")
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusTooManyRequests, rec.Code)
	assert.Equal(t, "60", rec.Header().Get("Retry-After"))
}

func TestRateLimitMiddleware_SkipsUnauthenticated(t *testing.T) {
	store := newMockStore()
	limiter := ratelimit.NewLimiter(store, 60)
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{
		PerUser:   1,
		PerTenant: 1,
	})

	handler := RateLimitMiddleware(limiter, policyStore)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// No tenant/user context = unauthenticated, should pass through
	for i := 0; i < 10; i++ {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
	}
}

func TestRateLimitMiddleware_PerRoutePolicy(t *testing.T) {
	store := newMockStore()
	limiter := ratelimit.NewLimiter(store, 60)
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{
		PerUser:   100,
		PerTenant: 1000,
	})
	policyStore.Register("/api/v1/auth", 2, 20)

	handler := RateLimitMiddleware(limiter, policyStore)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// Auth endpoint has limit of 2
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
		ctx = context.WithValue(ctx, userIDKey{}, "user-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
	}

	// Third request should be denied
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
	ctx = context.WithValue(ctx, userIDKey{}, "user-1")
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusTooManyRequests, rec.Code)
}

// TestRateLimitMiddleware_FailClosedOnRedisDown verifies that when the Redis
// store returns errors consistently, the breaker opens and the middleware
// returns 503 (fail-closed) rather than bypassing the limit.
func TestRateLimitMiddleware_FailClosedOnRedisDown(t *testing.T) {
	store := newMockStore()
	store.setFail(true)
	limiter := ratelimit.NewLimiterWithMode(store, 60, ratelimit.LimiterOptions{
		Mode:                ratelimit.ModeFailClosed,
		BreakerFailsToOpen:  2, // open after 2 consecutive fails
		BreakerOpenDuration: time.Second,
	})
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{PerUser: 10, PerTenant: 100})

	handler := RateLimitMiddleware(limiter, policyStore)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler must not run when limiter is degraded")
		}),
	)

	fire := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
		ctx = context.WithValue(ctx, userIDKey{}, "user-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}

	// First call: redis fails -> degraded -> 503 (fail-closed) immediately.
	rec := fire()
	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
	assert.Equal(t, "5", rec.Header().Get("Retry-After"))

	// Further calls also 503 (breaker opens after 2 fails).
	for i := 0; i < 3; i++ {
		rec := fire()
		assert.Equal(t, http.StatusServiceUnavailable, rec.Code, "call %d", i)
	}
}

// TestRateLimitMiddleware_FailOpenLocal verifies the opt-in local fallback
// mode: under Redis outage, requests are metered by a per-node token bucket
// and excess requests are rejected with 429.
func TestRateLimitMiddleware_FailOpenLocal(t *testing.T) {
	store := newMockStore()
	store.setFail(true)
	limiter := ratelimit.NewLimiterWithMode(store, 60, ratelimit.LimiterOptions{
		Mode:                ratelimit.ModeFailOpenLocal,
		BreakerFailsToOpen:  1,
		BreakerOpenDuration: 5 * time.Second,
	})
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{PerUser: 2, PerTenant: 1000})

	okCount := 0
	handler := RateLimitMiddleware(limiter, policyStore)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			okCount++
			w.WriteHeader(http.StatusOK)
		}),
	)

	fire := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
		ctx = context.WithValue(ctx, userIDKey{}, "user-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}

	// First 2 requests should pass via local bucket.
	rec := fire()
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "local", rec.Header().Get("X-RateLimit-Source"))

	rec = fire()
	require.Equal(t, http.StatusOK, rec.Code)

	// Third should be throttled by the bucket (capacity=2 per 60s).
	rec = fire()
	assert.Equal(t, http.StatusTooManyRequests, rec.Code)
	assert.Equal(t, 2, okCount, "local bucket should only admit 2")
}

// TestRateLimitMiddleware_BreakerHalfOpenRecovers verifies that once Redis
// recovers, the breaker closes and requests resume normally.
func TestRateLimitMiddleware_BreakerHalfOpenRecovers(t *testing.T) {
	store := newMockStore()
	store.setFail(true)
	limiter := ratelimit.NewLimiterWithMode(store, 60, ratelimit.LimiterOptions{
		Mode:                ratelimit.ModeFailClosed,
		BreakerFailsToOpen:  1,
		BreakerOpenDuration: 50 * time.Millisecond,
	})
	policyStore := ratelimit.NewPolicyStore(ratelimit.Policy{PerUser: 100, PerTenant: 1000})

	handler := RateLimitMiddleware(limiter, policyStore)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	fire := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
		ctx := context.WithValue(req.Context(), tenantIDKey{}, "tenant-1")
		ctx = context.WithValue(ctx, userIDKey{}, "user-1")
		req = req.WithContext(ctx)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}

	// Open the breaker.
	rec := fire()
	require.Equal(t, http.StatusServiceUnavailable, rec.Code)

	// Redis recovers.
	store.setFail(false)
	// Wait past the open window.
	time.Sleep(70 * time.Millisecond)

	// Half-open trial: first request should succeed via Redis.
	rec = fire()
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "redis", rec.Header().Get("X-RateLimit-Source"))
}

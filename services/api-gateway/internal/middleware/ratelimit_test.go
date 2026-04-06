package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/api-gateway/internal/ratelimit"
)

// mockStore is an in-memory rate limit store for testing.
type mockStore struct {
	counts map[string]int
}

func newMockStore() *mockStore {
	return &mockStore{counts: make(map[string]int)}
}

func (m *mockStore) Incr(_ context.Context, key string, _ int) (int, error) {
	m.counts[key]++
	return m.counts[key], nil
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

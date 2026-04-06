package ratelimit

import (
	"context"
	"fmt"
)

// Result holds the outcome of a rate limit check.
type Result struct {
	Allowed   bool
	Current   int
	Limit     int
	Remaining int
}

// Limiter provides sliding-window rate limiting using a pluggable store.
type Limiter struct {
	store     Store
	windowSec int
}

// NewLimiter creates a new rate limiter with the given store and window size.
func NewLimiter(store Store, windowSec int) *Limiter {
	return &Limiter{
		store:     store,
		windowSec: windowSec,
	}
}

// Allow checks whether the request identified by key is within the rate limit.
// It returns a Result with the current count, limit, and remaining quota.
func (l *Limiter) Allow(ctx context.Context, key string, limit int) (Result, error) {
	// A limit of 0 means no rate limiting for this key.
	if limit <= 0 {
		return Result{
			Allowed:   true,
			Current:   0,
			Limit:     0,
			Remaining: 0,
		}, nil
	}

	count, err := l.store.Incr(ctx, key, l.windowSec)
	if err != nil {
		return Result{}, fmt.Errorf("rate limit check: %w", err)
	}

	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}

	return Result{
		Allowed:   count <= limit,
		Current:   count,
		Limit:     limit,
		Remaining: remaining,
	}, nil
}

// UserKey returns the rate limit key for a specific user.
func UserKey(tenantID, userID string) string {
	return fmt.Sprintf("rl:user:%s:%s", tenantID, userID)
}

// TenantKey returns the rate limit key for a tenant.
func TenantKey(tenantID string) string {
	return fmt.Sprintf("rl:tenant:%s", tenantID)
}

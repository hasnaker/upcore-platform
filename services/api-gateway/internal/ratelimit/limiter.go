package ratelimit

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

// Mode controls behaviour when the backing store (Redis) is unreachable.
type Mode int

const (
	// ModeFailClosed rejects all requests when Redis is unavailable beyond the
	// circuit-breaker threshold. Safe default — DoS-resistant.
	ModeFailClosed Mode = iota
	// ModeFailOpenLocal falls back to an in-process per-key token bucket when
	// Redis is unavailable. Limits are still enforced (best-effort, per node).
	ModeFailOpenLocal
)

// Result holds the outcome of a rate limit check.
type Result struct {
	Allowed   bool
	Current   int
	Limit     int
	Remaining int
	// Source identifies where the decision came from: "redis", "local", "degraded".
	Source string
}

// LimiterOptions configures circuit-breaker and fallback behaviour.
type LimiterOptions struct {
	Mode                Mode
	BreakerFailsToOpen  int           // consecutive failures before opening; default 5
	BreakerOpenDuration time.Duration // how long the breaker stays open; default 30s
}

// Limiter provides sliding-window rate limiting with a Redis backend plus an
// optional in-memory fallback gated by a circuit breaker.
type Limiter struct {
	store     Store
	windowSec int
	opts      LimiterOptions

	// Circuit breaker state (lock-free readers).
	consecutiveFails atomic.Int32
	openUntilNano    atomic.Int64 // UnixNano; 0 = closed

	// Observability.
	redisDownTotal atomic.Int64
	localFallbacks atomic.Int64

	// Local fallback (token buckets per key).
	localMu      sync.Mutex
	localBuckets map[string]*tokenBucket
}

// NewLimiter creates a limiter with fail-closed semantics and default breaker
// settings. Kept for backwards compatibility.
func NewLimiter(store Store, windowSec int) *Limiter {
	return NewLimiterWithMode(store, windowSec, LimiterOptions{
		Mode:                ModeFailClosed,
		BreakerFailsToOpen:  5,
		BreakerOpenDuration: 30 * time.Second,
	})
}

// NewLimiterWithMode creates a limiter with explicit mode and breaker options.
func NewLimiterWithMode(store Store, windowSec int, opts LimiterOptions) *Limiter {
	if opts.BreakerFailsToOpen <= 0 {
		opts.BreakerFailsToOpen = 5
	}
	if opts.BreakerOpenDuration <= 0 {
		opts.BreakerOpenDuration = 30 * time.Second
	}
	return &Limiter{
		store:        store,
		windowSec:    windowSec,
		opts:         opts,
		localBuckets: make(map[string]*tokenBucket),
	}
}

// Allow checks whether the request identified by key is within the rate limit.
func (l *Limiter) Allow(ctx context.Context, key string, limit int) (Result, error) {
	if limit <= 0 {
		return Result{Allowed: true, Source: "redis"}, nil
	}

	// Short-circuit when the breaker is open.
	if open := l.openUntilNano.Load(); open != 0 {
		if time.Now().UnixNano() < open {
			return l.handleRedisOutage(key, limit), nil
		}
		// Half-open: let one attempt through by resetting the gate.
		l.openUntilNano.Store(0)
		l.consecutiveFails.Store(0)
	}

	count, err := l.store.Incr(ctx, key, l.windowSec)
	if err != nil {
		l.onRedisFailure()
		return l.handleRedisOutage(key, limit), nil
	}
	// Success — reset breaker.
	l.consecutiveFails.Store(0)

	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}
	return Result{
		Allowed:   count <= limit,
		Current:   count,
		Limit:     limit,
		Remaining: remaining,
		Source:    "redis",
	}, nil
}

func (l *Limiter) onRedisFailure() {
	l.redisDownTotal.Add(1)
	n := l.consecutiveFails.Add(1)
	if int(n) >= l.opts.BreakerFailsToOpen {
		deadline := time.Now().Add(l.opts.BreakerOpenDuration).UnixNano()
		l.openUntilNano.Store(deadline)
	}
}

func (l *Limiter) handleRedisOutage(key string, limit int) Result {
	switch l.opts.Mode {
	case ModeFailOpenLocal:
		l.localFallbacks.Add(1)
		bucket := l.getOrCreateBucket(key, limit)
		allowed, remaining := bucket.tryConsume()
		return Result{
			Allowed:   allowed,
			Current:   limit - remaining,
			Limit:     limit,
			Remaining: remaining,
			Source:    "local",
		}
	default: // ModeFailClosed
		return Result{
			Allowed:   false,
			Limit:     limit,
			Remaining: 0,
			Source:    "degraded",
		}
	}
}

func (l *Limiter) getOrCreateBucket(key string, capacity int) *tokenBucket {
	l.localMu.Lock()
	defer l.localMu.Unlock()
	b, ok := l.localBuckets[key]
	if !ok {
		// Refill rate: `capacity` tokens per `windowSec` seconds.
		b = newTokenBucket(capacity, float64(capacity)/float64(l.windowSec))
		l.localBuckets[key] = b
	} else if b.capacity != capacity {
		// Policy changed — keep old state but update capacity.
		b.capacity = capacity
		if b.tokens > float64(capacity) {
			b.tokens = float64(capacity)
		}
	}
	return b
}

// Metrics returns snapshot counters suitable for Prometheus exposition.
func (l *Limiter) Metrics() (redisDownTotal, localFallbackTotal, breakerOpen int64) {
	if l.openUntilNano.Load() > time.Now().UnixNano() {
		breakerOpen = 1
	}
	return l.redisDownTotal.Load(), l.localFallbacks.Load(), breakerOpen
}

// UserKey returns the rate limit key for a specific user.
func UserKey(tenantID, userID string) string {
	return fmt.Sprintf("rl:user:%s:%s", tenantID, userID)
}

// TenantKey returns the rate limit key for a tenant.
func TenantKey(tenantID string) string {
	return fmt.Sprintf("rl:tenant:%s", tenantID)
}

// tokenBucket is a standard token bucket with configurable refill rate.
type tokenBucket struct {
	mu         sync.Mutex
	capacity   int
	tokens     float64
	refillRate float64 // tokens per second
	last       time.Time
}

func newTokenBucket(capacity int, refillRate float64) *tokenBucket {
	return &tokenBucket{
		capacity:   capacity,
		tokens:     float64(capacity),
		refillRate: refillRate,
		last:       time.Now(),
	}
}

// tryConsume attempts to take one token. Returns (allowed, remaining).
func (b *tokenBucket) tryConsume() (bool, int) {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.last).Seconds()
	b.last = now
	b.tokens += elapsed * b.refillRate
	if b.tokens > float64(b.capacity) {
		b.tokens = float64(b.capacity)
	}

	if b.tokens < 1 {
		rem := int(b.tokens)
		if rem < 0 {
			rem = 0
		}
		return false, rem
	}
	b.tokens -= 1
	rem := int(b.tokens)
	return true, rem
}

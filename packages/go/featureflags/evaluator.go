// Package featureflags evaluates app.feature_flags with a small in-memory
// cache (60-second TTL). Her request IsEnabled() çağrısı ortalama 0 DB hit.
package featureflags

import (
	"context"
	"fmt"
	"hash/crc32"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Evaluator checks flags + rolls out percentages deterministically.
type Evaluator struct {
	DB       *sqlx.DB
	ttl      time.Duration
	mu       sync.RWMutex
	cache    map[string]cacheEntry
}

type cacheEntry struct {
	enabled    bool
	rolloutPct *int
	loadedAt   time.Time
}

// New constructs an Evaluator with 60s cache TTL.
func New(db *sqlx.DB) *Evaluator {
	return &Evaluator{DB: db, ttl: 60 * time.Second, cache: map[string]cacheEntry{}}
}

// IsEnabled returns true when the flag is on for the given tenant.
// Resolution order:
//  1. Tenant-specific row (app.feature_flags WHERE tenant_id=<id>).
//  2. Global row (tenant_id IS NULL).
//  3. Default false.
// Rollout_pct: deterministic hash of tenant_id → bucket [0..99].
func (e *Evaluator) IsEnabled(ctx context.Context, tenantID uuid.UUID, flagKey string) bool {
	key := fmt.Sprintf("%s:%s", tenantID, flagKey)
	e.mu.RLock()
	if c, ok := e.cache[key]; ok && time.Since(c.loadedAt) < e.ttl {
		e.mu.RUnlock()
		return c.enabled && e.rolloutMatches(tenantID, c.rolloutPct)
	}
	e.mu.RUnlock()

	enabled, rollout := e.load(ctx, tenantID, flagKey)
	e.mu.Lock()
	e.cache[key] = cacheEntry{enabled: enabled, rolloutPct: rollout, loadedAt: time.Now()}
	e.mu.Unlock()
	return enabled && e.rolloutMatches(tenantID, rollout)
}

// Invalidate clears the cache for one flag (call after admin updates).
func (e *Evaluator) Invalidate(tenantID uuid.UUID, flagKey string) {
	key := fmt.Sprintf("%s:%s", tenantID, flagKey)
	e.mu.Lock()
	delete(e.cache, key)
	e.mu.Unlock()
}

// InvalidateAll nukes the cache (admin global ops).
func (e *Evaluator) InvalidateAll() {
	e.mu.Lock()
	e.cache = map[string]cacheEntry{}
	e.mu.Unlock()
}

func (e *Evaluator) load(ctx context.Context, tenantID uuid.UUID, flagKey string) (enabled bool, rolloutPct *int) {
	type row struct {
		Enabled    bool `db:"enabled"`
		RolloutPct *int `db:"rollout_pct"`
	}
	var out row
	err := e.DB.GetContext(ctx, &out,
		`SELECT enabled, rollout_pct FROM app.feature_flags
		 WHERE flag_key = $2
		   AND (tenant_id = $1 OR tenant_id IS NULL)
		 ORDER BY tenant_id NULLS LAST LIMIT 1`,
		tenantID, flagKey)
	if err != nil {
		return false, nil
	}
	return out.Enabled, out.RolloutPct
}

// rolloutMatches: if rolloutPct nil → 100%. Else deterministic bucket.
func (e *Evaluator) rolloutMatches(tenantID uuid.UUID, rolloutPct *int) bool {
	if rolloutPct == nil || *rolloutPct >= 100 {
		return true
	}
	if *rolloutPct <= 0 {
		return false
	}
	h := crc32.ChecksumIEEE([]byte(tenantID.String()))
	return int(h%100) < *rolloutPct
}

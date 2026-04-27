// Package featureflag mirrors packages/go/featureflags but lives inside
// the employee service to keep go.mod flat (no replace directive).
// Evaluates app.feature_flags with 60-second cache.
package featureflag

import (
	"context"
	"fmt"
	"hash/crc32"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Evaluator caches flag rows.
type Evaluator struct {
	DB    *sqlx.DB
	ttl   time.Duration
	mu    sync.RWMutex
	cache map[string]entry
}

type entry struct {
	enabled  bool
	rollout  *int
	loadedAt time.Time
}

// New constructs an Evaluator with 60s TTL.
func New(db *sqlx.DB) *Evaluator {
	return &Evaluator{DB: db, ttl: 60 * time.Second, cache: map[string]entry{}}
}

// IsEnabled returns true if the flag resolves to on for the tenant.
// Resolution: tenant override → global default → false. Rollout deterministic.
func (e *Evaluator) IsEnabled(ctx context.Context, tenantID uuid.UUID, flagKey string) bool {
	key := fmt.Sprintf("%s:%s", tenantID, flagKey)
	e.mu.RLock()
	if c, ok := e.cache[key]; ok && time.Since(c.loadedAt) < e.ttl {
		e.mu.RUnlock()
		return c.enabled && e.rolloutMatches(tenantID, c.rollout)
	}
	e.mu.RUnlock()

	var out struct {
		Enabled    bool `db:"enabled"`
		RolloutPct *int `db:"rollout_pct"`
	}
	err := e.DB.GetContext(ctx, &out,
		`SELECT enabled, rollout_pct FROM app.feature_flags
		 WHERE flag_key=$2 AND (tenant_id=$1 OR tenant_id IS NULL)
		 ORDER BY tenant_id NULLS LAST LIMIT 1`,
		tenantID, flagKey)
	if err != nil {
		e.mu.Lock()
		e.cache[key] = entry{enabled: false, loadedAt: time.Now()}
		e.mu.Unlock()
		return false
	}
	e.mu.Lock()
	e.cache[key] = entry{enabled: out.Enabled, rollout: out.RolloutPct, loadedAt: time.Now()}
	e.mu.Unlock()
	return out.Enabled && e.rolloutMatches(tenantID, out.RolloutPct)
}

// Invalidate clears cache for a flag (after admin update).
func (e *Evaluator) Invalidate(tenantID uuid.UUID, flagKey string) {
	key := fmt.Sprintf("%s:%s", tenantID, flagKey)
	e.mu.Lock()
	delete(e.cache, key)
	e.mu.Unlock()
}

func (e *Evaluator) rolloutMatches(tenantID uuid.UUID, rolloutPct *int) bool {
	if rolloutPct == nil || *rolloutPct >= 100 {
		return true
	}
	if *rolloutPct <= 0 {
		return false
	}
	return int(crc32.ChecksumIEEE([]byte(tenantID.String()))%100) < *rolloutPct
}

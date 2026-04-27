package featureflags

import (
	"testing"

	"github.com/google/uuid"
)

func ptr(i int) *int { return &i }

func TestRolloutMatches_NilOr100IsAlwaysTrue(t *testing.T) {
	e := &Evaluator{}
	tid := uuid.New()
	if !e.rolloutMatches(tid, nil) {
		t.Errorf("nil rollout must pass")
	}
	if !e.rolloutMatches(tid, ptr(100)) {
		t.Errorf("100%% rollout must pass")
	}
	if !e.rolloutMatches(tid, ptr(150)) {
		t.Errorf(">100%% rollout must pass (clamped)")
	}
}

func TestRolloutMatches_ZeroOrNegativeIsAlwaysFalse(t *testing.T) {
	e := &Evaluator{}
	tid := uuid.New()
	if e.rolloutMatches(tid, ptr(0)) {
		t.Errorf("0%% rollout must fail")
	}
	if e.rolloutMatches(tid, ptr(-5)) {
		t.Errorf("negative rollout must fail")
	}
}

func TestRolloutMatches_DeterministicPerTenant(t *testing.T) {
	e := &Evaluator{}
	tid := uuid.New()
	first := e.rolloutMatches(tid, ptr(50))
	for i := 0; i < 50; i++ {
		if e.rolloutMatches(tid, ptr(50)) != first {
			t.Fatalf("rollout must be deterministic for same tenant")
		}
	}
}

func TestRolloutMatches_DistributionApproachesTarget(t *testing.T) {
	// 1000 farklı tenant üzerinden 25% rollout'un gerçek yüzdesi hedefe
	// yakın olmalı — CRC32 pseudo-random, mükemmel değil, ± 7 pp tolerans.
	e := &Evaluator{}
	rollout := ptr(25)
	matches := 0
	for i := 0; i < 1000; i++ {
		if e.rolloutMatches(uuid.New(), rollout) {
			matches++
		}
	}
	if matches < 180 || matches > 320 {
		t.Errorf("25%% rollout distribution drifted: got %d/1000", matches)
	}
}

func TestEvaluator_Invalidate_RemovesCachedEntry(t *testing.T) {
	e := &Evaluator{cache: map[string]cacheEntry{}}
	tid := uuid.New()
	key := tid.String() + ":my_flag"
	e.cache[key] = cacheEntry{enabled: true}
	e.Invalidate(tid, "my_flag")
	if _, ok := e.cache[key]; ok {
		t.Errorf("cache entry not removed")
	}
}

func TestEvaluator_InvalidateAll(t *testing.T) {
	e := &Evaluator{cache: map[string]cacheEntry{
		"a:flag": {enabled: true},
		"b:flag": {enabled: false},
	}}
	e.InvalidateAll()
	if len(e.cache) != 0 {
		t.Errorf("cache should be empty after InvalidateAll, got %d entries", len(e.cache))
	}
}

func TestNew_DefaultsTTL60s(t *testing.T) {
	e := New(nil)
	if e.ttl.Seconds() != 60 {
		t.Errorf("default ttl should be 60s, got %v", e.ttl)
	}
	if e.cache == nil {
		t.Errorf("cache map must be initialised")
	}
}

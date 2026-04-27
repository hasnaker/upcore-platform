# Thompson Sampling — Reproducibility & Algorithmic Transparency

## Summary
The intervention recommender (`services/intervention`) uses Thompson sampling on
a per-arm Beta posterior to rank interventions. To meet KVKK Madde 22
(automated-decision transparency) and to enable A/B-test replay, every
recommendation session is driven by a deterministic RNG seeded from
`(tenant_id, hour_bucket)`.

## Seed contract
```
seed = FNV-1a-64( tenant_id_utf8 ⊕ little_endian(bucket_seconds / 3600) )
rng  = math/rand.New(rand.NewSource(seed))
```

Constants are centralised in:
- `services/intervention/internal/bandit/beta.go` → `NewRNGForTenant`
- `services/intervention/internal/service/recommender_service.go` → `banditBucketSeconds = 3600`

## Reproducibility guarantee
For the same `(tenant_id, bucket)` pair, any number of independent process
invocations produce the **same** Beta sample sequence and therefore the same
ranked recommendation list (given the same catalog + posteriors).

This is enforced by two unit tests in `bandit/beta_test.go`:
- `TestNewRNGForTenantIsDeterministic` — same seed ⇒ identical sequence.
- `TestNewRNGForTenantDiverges` — different tenant or bucket ⇒ different sequence.

## Why an hourly bucket
- Short enough that arm-exploration is not frozen for more than one hour.
- Long enough that a user refreshing the recommender page within minutes sees
  a stable list (UX, no "randomness theater").
- Aligned with our burnout-signal snapshot window.

## Rationale: why not per-request seed?
A per-request seed (timestamp nanos) would defeat replay: an auditor asked
"why was intervention X recommended to tenant T on 2026-03-17 14:05?" cannot
re-derive the same sample without the original seed. Bucketed seeds make the
seed a deterministic function of tenant + wall-clock time, so replay needs no
seed-log. This also provides a natural rate-of-exploration knob (bucket width).

## Rationale: why not a per-tenant static seed?
A static per-tenant seed would starve the less-sampled arms forever — whichever
arm wins the first sample keeps winning. Rotating the seed hourly gives the
exploration loop its chance while preserving within-window determinism.

## Audit trail
The recommender writes the list, the sampled values, the posterior state, and
the bucket id into `intervention_recommendation_log` (see audit service). On
replay request (KVKK or internal A/B review) the log entry is replayable:
1. Load posteriors at `t = bucket * 3600`.
2. Seed `NewRNGForTenant(tenant_id, bucket)`.
3. Call `ThompsonSampleValues(arms)` and compare samples to the logged vector.

Any divergence is an integrity incident (replay failure) and triggers the
ML-audit runbook.

## Limits and trade-offs
- The seed is not a cryptographic commitment. A malicious operator with
  database access could rewrite posteriors retroactively, though audit WORM
  makes that detectable.
- The bucket boundary creates a visible discontinuity at :00 each hour; this
  is intentional and documented for UX.
- The hash function (FNV-1a) is non-cryptographic; we only need uniform
  distribution across tenants, not adversarial-resistance.

## Related
- `docs/kvkk/hard-vs-soft-delete.md` — Madde 11 vs audit immutability.
- `docs/runbook/intervention.md` — operational recovery.

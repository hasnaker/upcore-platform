# Runbook — intervention

> Burnout intervention catalog, Thompson-bandit recommender, consent flow, effect measurement.

## Ownership
- **Primary owner**: Science squad
- **On-call rotation**: PagerDuty schedule `pd-science`
- **Slack**: `#oncall-science`
- **Escalation**: Science lead → VP Eng → CTO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/interventions/catalog` | list | 200 ms |
| `POST /api/v1/interventions/recommend` | Thompson sample → top-K | 500 ms |
| `POST /api/v1/interventions/assign` | create assignment | 400 ms |
| `POST /api/v1/interventions/:id/consent` | user consent | 300 ms |
| `GET /api/v1/interventions/:id/effect` | Cohen's d | 500 ms |

## Alerts
- **RecommenderErrorRate** — `/recommend` 5xx > 1% → page.
- **ConsentFail** — consent endpoint 5xx → page (KVKK critical).
- **BanditDivergence** — replay mismatch alarm → warn (A/B integrity).
- **HighErrorRate** — 5xx > 2% → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/intervention/intervention-overview`
- A/B replay dashboard: `https://grafana.upcore.internal/d/intervention-ab`

## Common failure modes
### 1. Empty catalog in recommend
Symptom: `/recommend` returns `[]` despite active tenant.
Fix: verify `intervention_catalog.active=true` for tenant's subscribed modules; seed via `ops/scripts/intervention-seed.sh <tenant>`.

### 2. Bandit seed mismatch on replay
Symptom: replay audit fails (see `docs/ml/thompson-bandit.md`).
Fix: verify `banditBucketSeconds = 3600` unchanged; look at `NewRNGForTenant` commit history; escalate to Science.

### 3. Consent row missing at effect-measurement time
Symptom: effect endpoint 409 "no consent".
Fix: user withdrew consent → cannot compute effect. Document and surface empty-state in UI.

### 4. Cohen's d diverges (numerically unstable)
Symptom: effect shows NaN / Inf.
Fix: check pooled SD denominator > 0; n_pre ≥ 3 and n_post ≥ 3 guards in `stats/cohens_d.go`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/intervention`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/intervention`

## Contacts
- On-call: `pd-science` · Slack: `#squad-science`
- KVKK / automated decisions: `dpo@upcore.io` (see Madde 22)
- Security: `security@upcore.io`

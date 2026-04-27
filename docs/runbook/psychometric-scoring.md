# Runbook — psychometric-scoring

> Python ML service: scores BAT-12-TR, COPSOQ-III-TR, UWES-9, UpCap-TR, JCS; produces dimension scores + norm percentiles.

## Ownership
- **Primary owner**: Science squad (ML)
- **On-call rotation**: PagerDuty schedule `pd-ml`
- **Slack**: `#oncall-ml`
- **Escalation**: ML lead → Science lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /score/bat-tr` | BAT-12-TR scoring | 200 ms |
| `POST /score/upcap-tr` | UpCap-TR scoring | 200 ms |
| `POST /score/jcs` | Job Crafting scoring | 200 ms |
| `POST /score/batch` | async bulk | queue |
| `GET /healthz` | liveness | 50 ms |

## Alerts
- **ScoringFail** — 5xx > 1% → page (science-critical).
- **NormTableMiss** — percentile lookup 404 > 5% → warn.
- **ModelHashDrift** — loaded model hash != git-pinned → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/psychometric/psychometric-overview`

## Common failure modes
### 1. Item ordering mismatch (instrument version drift)
Symptom: systematic under-scoring after deploy.
Fix: verify `instrument_version` column matches service constants `ml-services/psychometric-scoring/instruments/`; rollback if mismatch.

### 2. Norm table missing for new demographic
Symptom: percentile = null for specific industry / age bucket.
Fix: fall back to European norm; file Science ticket to collect local norm.

### 3. Pydantic v2 validation regression
Symptom: all requests 422.
Fix: check recent Pydantic upgrade; pin version in `pyproject.toml`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/psychometric-scoring`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/psychometric-scoring`

## Contacts
- On-call: `pd-ml` · Slack: `#squad-ml`
- Science Instrument owners: per instrument (BAT: Prof X; UpCap: Prof Y)
- KVKK: `dpo@upcore.io`

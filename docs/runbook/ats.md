# Runbook — ats

> Applicant tracking: job posting, pipeline, candidate communication.

## Ownership
- **Primary owner**: Talent squad
- **On-call rotation**: PagerDuty schedule `pd-talent`
- **Slack**: `#oncall-talent`
- **Escalation**: Talent lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/ats/jobs` | job list | 300 ms |
| `POST /api/v1/ats/jobs/:id/candidates` | apply | 500 ms |
| `POST /api/v1/ats/candidates/:id/advance` | stage move | 300 ms |
| `GET /api/v1/ats/candidates/:id` | profile | 200 ms |

## Alerts
- **PipelineStageSkew** — candidates stuck in a stage > 30 days > 100 → warn.
- **HighErrorRate** — 5xx > 2% → page.
- **JobBoardSyncFail** — LinkedIn/Indeed push fail > 5% → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/ats/ats-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/ats`

## Common failure modes
### 1. Duplicate candidate (resubmission)
Symptom: same email applies twice to same job.
Fix: merge via admin UI; long-term: dedup by `(tenant_id, email, job_id)` hash.

### 2. Slow candidate search (full-text)
Symptom: `/candidates?q=…` > 3 s.
Fix: verify `tsvector` index; refresh `REINDEX INDEX CONCURRENTLY idx_candidate_search_tsv`.

### 3. External job board webhook lost
Symptom: new applicants not appearing.
Fix: check `ats_external_webhook.last_seen_at`; re-subscribe via `ops/scripts/ats-board-resubscribe.sh`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/ats`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/ats`

## Contacts
- On-call: `pd-talent` · Slack: `#squad-talent`
- Security: `security@upcore.io`

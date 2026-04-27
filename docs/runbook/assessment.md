# Runbook — assessment

> Candidate assessments (cognitive, personality) during ATS pipeline.

## Ownership
- **Primary owner**: Science squad
- **On-call rotation**: PagerDuty schedule `pd-science`
- **Slack**: `#oncall-science`
- **Escalation**: Science lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /api/v1/assessments/invite` | send link | 400 ms |
| `POST /api/v1/assessments/:id/submit` | candidate submit | 800 ms |
| `GET /api/v1/assessments/:id/report` | scored report | 1 s |

## Alerts
- **ScoringFail** — > 1% scoring errors → page.
- **InviteDelay** — invite -> delivered > 5 min p95 → warn.
- **HighErrorRate** — 5xx > 2% → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/assessment/assessment-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/assessment`

## Common failure modes
### 1. Candidate link 410 gone
Symptom: tenant reports candidates cannot access assessment.
Fix: check link TTL; default 14 days; `ops/scripts/assessment-extend.sh <id>`.

### 2. Cognitive timer drift
Symptom: timer runs past limit on client clock skew.
Fix: server-side enforcement already in place; verify `assessment_attempt.server_expires_at` trumps client.

### 3. PDF report generation fails
Symptom: 500 on `/report`.
Fix: check wkhtmltopdf pod; restart; fall back to JSON report via feature flag.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/assessment`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/assessment`

## Contacts
- On-call: `pd-science` · Slack: `#squad-science`
- Security: `security@upcore.io`

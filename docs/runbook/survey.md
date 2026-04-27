# Runbook — survey

> Pulse / 360 / BAT-TR / UpCap survey engine; scientific instruments with response scoring.

## Ownership
- **Primary owner**: Science squad
- **On-call rotation**: PagerDuty schedule `pd-science`
- **Slack**: `#oncall-science`
- **Escalation**: Science lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/surveys` | list | 300 ms |
| `POST /api/v1/surveys/:id/responses` | submit | 500 ms |
| `GET /api/v1/surveys/:id/results` | aggregate | 1 s |
| `POST /api/v1/surveys/:id/invite` | send invites | 10 s |

## Alerts
- **InviteSendFail** — > 5% invite email 4xx from provider → warn.
- **ScoringFail** — scoring job errors > 1% → page.
- **DuplicateResponse** — > 2 submissions from same user/same survey/hour → warn.
- **HighErrorRate** — 5xx > 2% → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/survey/survey-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/survey`

## Common failure modes
### 1. Response submission 500 (psychometric out-of-range)
Symptom: specific instrument fails scoring (e.g., BAT-TR item 13 null).
Fix: check `instrument_version` in request vs DB; may be a stale client using old item ordering. Deploy client hotfix; server re-scores via `ops/scripts/survey-rescore.sh`.

### 2. Invitation email provider outage
Symptom: batch invite jobs retrying, stuck.
Fix: switch provider via feature flag `survey.email_provider=postmark→sendgrid`.

### 3. Aggregation query slow (n_responses > 100k)
Symptom: `/results` timeout.
Fix: verify `idx_survey_response_(survey_id, created_at)` exists; run `VACUUM ANALYZE`; consider materialized view `survey_aggregate_mv` refresh.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/survey`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/survey`

## Contacts
- On-call: `pd-science` · Slack: `#squad-science`
- Science lead (BAT/UpCap): Slack DM per instrument owner
- Security: `security@upcore.io`

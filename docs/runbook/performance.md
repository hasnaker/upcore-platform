# Runbook — performance

> OKR tracking, 360 review, 9-box calibration, PIP workflow, year-end evaluation.

## Ownership
- **Primary owner**: People-Platform squad
- **On-call rotation**: PagerDuty schedule `pd-people`
- **Slack**: `#oncall-people`
- **Escalation**: People-Platform lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/performance/okrs` | list OKRs | 300 ms |
| `POST /api/v1/performance/okrs` | create | 400 ms |
| `POST /api/v1/performance/reviews` | submit 360 review | 500 ms |
| `GET /api/v1/performance/nine-box/:cycle` | calibration | 800 ms |
| `POST /api/v1/performance/pip` | PIP create | 500 ms |

## Alerts
- **CycleClose** — review cycle missing close-out > deadline → warn.
- **HighErrorRate** — 5xx > 2% → page.
- **PIPSLABreach** — PIP missing checkpoint > 14 days → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/performance/performance-overview`

## Common failure modes
### 1. Key Result calculation mismatch
Symptom: UI shows 70%, DB row says 65%.
Fix: verify `progress_formula` in `okr_key_result`; recompute via `ops/scripts/okr-recompute.sh <tenant>`.

### 2. 9-box calibration lock race
Symptom: two calibrators saving simultaneously → optimistic-lock conflict.
Fix: returned 409 is correct behavior; UI must retry. If persistent, investigate advisory-lock in `nine_box_calibration_session`.

### 3. PIP privacy leak (wrong viewer)
Symptom: employee sees colleague's PIP row.
Fix: CRITICAL — page security@; verify RLS policy `pip_row_policy`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/performance`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/performance`

## Contacts
- On-call: `pd-people` · Slack: `#squad-people`
- Security: `security@upcore.io` · DPO: `dpo@upcore.io`

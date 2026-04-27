# Runbook — leave

> Leave request workflow, balance ledger, approval chain, calendar sync.

## Ownership
- **Primary owner**: People-Platform squad
- **On-call rotation**: PagerDuty schedule `pd-people`
- **Slack**: `#oncall-people`
- **Escalation**: People-Platform lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/leaves` | list | 200 ms |
| `POST /api/v1/leaves` | submit | 300 ms |
| `POST /api/v1/leaves/:id/approve` | approver action | 300 ms |
| `GET /api/v1/leaves/balance/:user_id` | balance | 100 ms |
| `POST /api/v1/leaves/:id/cancel` | cancel | 200 ms |

## Alerts
- **BalanceNegative** — any ledger row balance_after < 0 → page.
- **ApprovalBacklog** — pending leaves > 72h old > 10 → warn.
- **CalendarSyncFail** — Google/O365 push > 5% fail → warn.
- **HighErrorRate** — 5xx > 2% → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/leave/leave-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/leave`

## Common failure modes
### 1. Negative balance (ledger integrity)
Symptom: employee has -2 days after approval. CRITICAL for compliance.
Fix: freeze approvals (`leave.freeze=true` flag); run `ops/scripts/leave-recompute.sh <tenant>`; reconcile ledger; unfreeze.

### 2. Approver offline, workflow stuck
Symptom: request pending > N days, no SLA escalation fired.
Fix: check `leave_approval_chain.escalate_after`; manually run `ops/scripts/leave-escalate.sh`.

### 3. Calendar push fail
Symptom: Google Calendar 403/404.
Fix: refresh OAuth token for tenant; check `tenant_calendar_integration.token_expires_at`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/leave`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/leave`

## Contacts
- On-call: `pd-people` · Slack: `#squad-people`
- Security: `security@upcore.io`

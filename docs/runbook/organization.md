# Runbook — organization

> Org chart, departments, cost centers, reporting lines; read-heavy.

## Ownership
- **Primary owner**: People-Platform squad
- **On-call rotation**: PagerDuty schedule `pd-people`
- **Slack**: `#oncall-people`
- **Escalation**: People-Platform lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/organization/tree` | org chart | 500 ms |
| `GET /api/v1/departments` | list | 200 ms |
| `POST /api/v1/departments` | create | 300 ms |
| `PATCH /api/v1/employees/:id/reports-to` | reassign | 400 ms |

## Alerts
- **TreeCycle** — manager loop detected → page.
- **HighErrorRate** — 5xx > 2% → page.
- **TreeDepth** — > 15 levels → warn (data-quality signal).

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/organization/organization-overview`

## Common failure modes
### 1. Manager loop (A reports to B reports to A)
Symptom: 500 on tree build, CTE infinite recursion.
Fix: SQL `WITH RECURSIVE … WHERE depth < 30` guards; find offending row `SELECT * FROM org.reports_to WHERE employee_id IN (SELECT manager_id FROM org.reports_to WHERE manager_id = employee_id)`; fix by nulling one side.

### 2. Org-chart cache stale
Symptom: UI shows old manager.
Fix: `POST /admin/cache/flush/organization-tree/<tenant>`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/organization`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/organization`

## Contacts
- On-call: `pd-people` · Slack: `#squad-people`
- Security: `security@upcore.io`

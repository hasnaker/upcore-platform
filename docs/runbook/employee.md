# Runbook — employee

> Canonical employee directory, hiring/termination lifecycle, offer letter, e-sign webhook.

## Ownership
- **Primary owner**: People-Platform squad
- **On-call rotation**: PagerDuty schedule `pd-people`
- **Slack**: `#oncall-people`
- **Escalation**: People-Platform lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/employees` | list (keyset cursor) | 250 ms |
| `GET /api/v1/employees/:id` | fetch | 100 ms |
| `POST /api/v1/employees` | create | 400 ms |
| `POST /api/v1/employees/bulk-import` | CSV import | 30 s |
| `POST /api/v1/employees/:id/terminate` | lifecycle | 500 ms |
| `POST /webhooks/esign` | DocuSign/e-imza callback | 500 ms |

## Alerts
- **HighErrorRate** — 5xx > 2% over 5 min → page.
- **ImportFailureRate** — > 10% of import rows rejected → warn.
- **OutboxBacklog** — `employee.outbox` unacked > 1000 → page.
- **ESignWebhookLate** — callback > 30 min late → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/employee/employee-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/employee`

## Common failure modes
### 1. Bulk import stuck
Symptom: import job in `processing` > 10 min.
Fix: inspect `employee_import_job` row; `kubectl logs` for the worker; re-enqueue with `ops/scripts/employee-import-retry.sh <job_id>`.

### 2. Outbox publisher down
Symptom: `outbox.*` rows pile up, downstream (payroll, survey) don't see new hires.
Fix: restart worker pod; check Service Bus credentials; see `outbox_admin.go` health.

### 3. Duplicate employee by email
Symptom: unique constraint violation in create.
Fix: clarify with customer if merge intended; run `ops/scripts/employee-merge.sh`.

### 4. E-sign callback signature fail
Symptom: webhook returns 401 "bad signature".
Fix: verify webhook secret rotation; update ConfigMap `ESIGN_WEBHOOK_SECRET`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/employee`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/employee`

## Contacts
- On-call: `pd-people` · Slack: `#squad-people`
- DocuSign support via shared 1Password.
- Security: `security@upcore.io` · DPO: `dpo@upcore.io`

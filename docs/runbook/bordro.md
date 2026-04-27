# Runbook — bordro

> Turkish payroll engine: SGK bildirge (APB/İGB/İAB), gelir vergisi, kıdem tazminatı; legal deadlines.

## Ownership
- **Primary owner**: Payroll squad
- **On-call rotation**: PagerDuty schedule `pd-payroll`
- **Slack**: `#oncall-payroll`
- **Escalation**: Payroll lead → CFO → CEO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /api/v1/bordro/runs` | start payroll run | 30 s |
| `GET /api/v1/bordro/runs/:id` | run status | 300 ms |
| `POST /api/v1/bordro/sgk/export` | APB XML export | 60 s |
| `GET /api/v1/bordro/payslips/:id` | PDF | 500 ms |

## Alerts
- **RunFail** — payroll run job fails → page CRITICAL.
- **SGKExportFail** — APB/İGB/İAB XML schema invalid → page CRITICAL.
- **TaxTableMismatch** — hash of 2026 tax tables differs from published → page.
- **HighErrorRate** — 5xx > 2% → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/bordro/bordro-overview`

## Common failure modes
### 1. Payroll run partial fail
Symptom: some employees scored, others stuck "processing".
Fix: check worker logs for the stuck employee ID; likely missing SGK number or tax code; fix record and retry via `ops/scripts/bordro-retry-employee.sh <run_id> <employee_id>`.

### 2. SGK XML schema drift (annual update)
Symptom: all exports fail validation after Jan 1.
Fix: SGK publishes XSD updates; see `services/bordro/internal/sgk/xsd/` → update + tests; release hotfix.

### 3. Kıdem tazminatı ceiling change mid-year
Symptom: ceilings hardcoded in old deploy.
Fix: update `bordro_constant` row for current period; no code change; verify via unit test.

### 4. Payslip PDF Turkish character corruption
Symptom: İ, ş, ğ display as boxes.
Fix: verify DejaVu/Noto font is packaged in image; rebuild if lost.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/bordro`
- Rollback: payroll deploys require NO backwards-incompatible schema migration during active run window.

## Contacts
- On-call: `pd-payroll` · Slack: `#squad-payroll`
- Finance: `finance@upcore.io`
- SGK support (legal escalation): DPO `dpo@upcore.io`

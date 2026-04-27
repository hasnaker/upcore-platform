# Runbook — tenant

> Source of truth for tenant config, modules, seats, SSO mapping; blocks onboarding when down.

## Ownership
- **Primary owner**: Platform Core squad
- **On-call rotation**: PagerDuty schedule `pd-platform`
- **Slack**: `#oncall-platform`
- **Escalation**: Platform lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/tenants/:slug` | tenant resolve | 100 ms |
| `POST /api/v1/tenants` | new tenant | 1 s |
| `GET /api/v1/tenants/:id/modules` | enabled modules | 50 ms |
| `PATCH /api/v1/tenants/:id/features` | flag update | 200 ms |

## Alerts
- **TenantResolveFail** — > 1% of `/tenants/:slug` 4xx → page.
- **p95Latency** — p95 > 300 ms for 10 min → page.
- **RLSLeakTest** — hourly cron detects cross-tenant row read → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/tenant/tenant-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/tenant`

## Common failure modes
### 1. Tenant cache poisoning
Symptom: wrong module list served after config change.
Fix: `kubectl -n upcore-prod exec -it deploy/tenant -- curl -XPOST localhost:8080/admin/cache/flush`.

### 2. RLS policy misfire
Symptom: tenant sees another tenant's data (CRITICAL).
Fix: page security@ immediately; follow `docs/security/rls-incident.md`; rollback latest migration.

### 3. Seat-count drift vs billing
Symptom: billing disagrees with tenant service about seats.
Fix: run reconciliation `ops/scripts/seat-reconcile.sh <tenant>`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/tenant`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/tenant`

## Contacts
- On-call: `pd-platform` · Slack: `#squad-platform`
- Security: `security@upcore.io` · DPO: `dpo@upcore.io`

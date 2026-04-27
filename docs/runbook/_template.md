# Runbook — <service name>

> One sentence. What this service does and who breaks when it is down.

## Ownership
- **Primary owner**: <name / squad>
- **On-call rotation**: PagerDuty schedule `<pd-schedule-id>`
- **Slack**: `#oncall-<service>`
- **Escalation**: Engineering lead → CTO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /healthz` | liveness | 50 ms |
| … | … | … |

## Alerts
- **HighErrorRate** — 5xx > 2% over 5 min → page.
- **p95Latency** — p95 > 500 ms for 10 min → page.
- **SLOBurn** — fast-burn budget > 2× → page.
- **DB** — connection pool saturation > 80% → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/<uid>`
- Datadog: `https://app.datadoghq.eu/dashboard/<id>`
- Logs (Loki): `https://grafana.upcore.internal/explore?orgId=1&service=<name>`

## Common failure modes
### 1. High error rate after deploy
Symptom: 5xx spike immediately after rollout.
Fix: `kubectl -n prod rollout undo deploy/<name>`; verify with `/healthz`.

### 2. DB saturation
Symptom: p95 climb + connection errors in logs.
Fix: scale replicas; check for long-running query; run `EXPLAIN` on logged slow query.

### 3. Dependency outage
Symptom: downstream 502s; circuit-breaker open.
Fix: check dependency runbook; enable graceful-degradation flag via feature flag.

## Recovery
- Restart: `kubectl -n prod rollout restart deploy/<name>`
- Rollback: `kubectl -n prod rollout undo deploy/<name>`
- Full disaster: see `docs/SECURITY_HARDENING.md` section "DR".

## Contacts
- On-call: PagerDuty (above)
- Owner Slack: `#squad-<team>`
- Security incidents: `security@upcore.io`

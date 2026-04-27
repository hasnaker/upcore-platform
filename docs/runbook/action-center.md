# Runbook — action-center

> Python ML: action plan generator for HR; next-best-action recommendations from burnout signals + OKRs.

## Ownership
- **Primary owner**: Science squad (ML)
- **On-call rotation**: PagerDuty schedule `pd-ml`
- **Slack**: `#oncall-ml`
- **Escalation**: ML lead → Science lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /actions/generate` | produce action list | 3 s |
| `GET /actions/:tenant_id` | latest actions | 300 ms |
| `POST /actions/:id/ack` | HR acknowledged | 200 ms |

## Alerts
- **GenerationFail** — 5xx > 1% → page.
- **StaleActions** — `/actions` served > 24h old → warn.
- **LLMProviderFail** — upstream 5xx → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/action-center/action-center-overview`

## Common failure modes
### 1. Empty action list for active tenant
Symptom: generation returns `[]` despite known signals.
Fix: verify feature flags; ensure tenant has required modules (`koruma`, `performans`) enabled.

### 2. Slow generation (> 10 s)
Symptom: tail latency.
Fix: shard by tenant into async queue; return last-good from cache.

### 3. Inappropriate action suggested
Symptom: HR reports suggestion violates policy.
Fix: capture to `action_center_reject_log`; feed into prompt-tuning backlog.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/action-center`
- Rollback prompt: update `PROMPT_VERSION`, redeploy.

## Contacts
- On-call: `pd-ml` · Slack: `#squad-ml`
- Security: `security@upcore.io`

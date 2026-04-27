# Runbook — api-gateway

> Public HTTP entrypoint for all tenant traffic; if it dies, every product page dies.

## Ownership
- **Primary owner**: Platform Infra squad
- **On-call rotation**: PagerDuty schedule `pd-platform`
- **Slack**: `#oncall-platform`
- **Escalation**: Platform lead → VP Eng → CTO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /healthz` | liveness | 50 ms |
| `GET /readyz` | readiness | 50 ms |
| `* /api/v1/*` | reverse-proxy to domain services | 250 ms |
| `GET /metrics` | Prometheus scrape | 100 ms |

## Alerts
- **HighErrorRate** — 5xx > 1% over 5 min (tighter than service alerts) → page.
- **p95Latency** — p95 > 400 ms for 10 min → page.
- **RateLimitSurge** — 429 rate > 10× baseline for 5 min → page.
- **UpstreamFail** — any domain service 5xx > 20% upstream → page.
- **CertExpiry** — TLS cert < 14 days → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/api-gateway/api-gateway-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/api-gateway`
- Loki: `https://grafana.upcore.internal/explore?service=api-gateway`

## Common failure modes
### 1. Ingress cert expired
Symptom: users see `NET::ERR_CERT_DATE_INVALID`.
Fix: verify cert-manager Order, `kubectl -n cert-manager describe order`; force renew: `kubectl delete certificate upcore-prod-tls` (cert-manager recreates).

### 2. CORS wall for new origin
Symptom: browser reports CORS, service is healthy.
Fix: add origin to `ALLOWED_ORIGINS` env via SealedSecret, redeploy. Verify with `curl -H 'Origin: …' -I`.

### 3. Rate-limit misfire after traffic spike
Symptom: 429 storm, legit users blocked.
Fix: temporarily raise `RATE_LIMIT_RPS` ConfigMap; investigate upstream spike.

### 4. Tenant header missing
Symptom: downstream services refuse requests with 401 "tenant_id missing".
Fix: check `X-Tenant-ID` propagation in gateway middleware; recent deploys may have regressed.

### 5. Upstream DNS flap
Symptom: intermittent 502 to a specific service.
Fix: `kubectl -n upcore-prod get endpoints <svc>`; restart gateway pods to refresh DNS cache.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/api-gateway`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/api-gateway`
- Scale: target 3× baseline replicas under incident.
- Kill switch: route traffic to maintenance page via Istio VirtualService `maintenance.yaml`.

## Contacts
- On-call: PagerDuty `pd-platform`
- Slack: `#squad-platform`
- Security incidents: `security@upcore.io`

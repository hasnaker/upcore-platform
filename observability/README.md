# UpCore Observability

Prometheus alert kuralları + Grafana dashboard JSON'ları.

## İçerik

| Dosya | Amaç |
|---|---|
| `prometheus/alerts.yml` | API latency + error rate + infra + security + business SLO alarmları |
| `dashboards/api-golden-signals.json` | Rate / Errors / Latency / Saturation (RED + USE) |
| `dashboards/db-and-queue.json` | PostgreSQL + outbox + Service Bus + saga |
| `dashboards/business-slo.json` | 99.9% uptime + error budget + bordro + KVKK SLA |

## Kurulum

### Prometheus
```bash
kubectl apply -f observability/prometheus/alerts.yml -n monitoring
```

### Grafana (import)
Grafana UI → Dashboards → Import → `.json` dosyasını yükle.
Data source olarak `Prometheus` seç.

## SLO'lar (kaynak: SOC 2 A1, SLA)

| SLO | Hedef | Ölçüm penceresi |
|---|---|---|
| API availability | 99.9% aylık | rolling 30d |
| p95 API latency | < 800 ms | 5 dk window |
| p99 API latency | < 3 s | 5 dk window |
| Bordro calculation success | ≥ 99% | rolling 7d |
| KVKK export 30-day SLA | ≥ 99% | rolling 30d |
| Outbox dispatcher lag | < 2 dk | p95 |

## Alert severity → eskalasyon

- `critical` → PagerDuty on-call
- `warning` → Slack #sre-alerts
- `security` → Slack #security + CISO email

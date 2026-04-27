# Runbook — On-Call Procedures

**Owner:** Hasan Aker · **Updated:** 2026-04-24
**Schedule:** Solo founder → 24/7 primary. Escalation: none (yet).

---

## 1. Severity Matrix

| Severity | Definition | Response SLA | Routing |
|---|---|---|---|
| **P0** | Customer-facing outage · data loss · security breach · SGK/KVKK compliance violation | 5 dk acknowledge · 1 saat mitigation | PagerDuty (push+SMS) + Slack #sre-incidents + Azure Monitor AG (email+SMS backup) |
| **P1** | Degraded performance · partial outage · SLA at risk (p95 > 500ms sustained) · single tenant locked out | 15 dk ack · 4 saat mitigation | PagerDuty (push) + Slack #sre-alerts |
| **P2** | Infrastructure warning · disk 80% · stale cache · single worker stuck | 1 saat ack · next business day | Slack #sre-alerts only |
| **P3** | Informational · cost anomaly · weekly SLO report | Async review | Slack #sre-noise |

---

## 2. Alert → Runbook Map

| Alert name | Severity | Runbook |
|---|---|---|
| `PostgresDown` | P0 | [postgres-pgbouncer.md](./postgres-pgbouncer.md) |
| `RegionOutage` | P0 | [dr-drill.md](./dr-drill.md) |
| `APIGatewayErrorRateHigh` | P0 | [api-gateway.md](./api-gateway.md) |
| `TenantRLSBreach` | P0 | [tenant.md](./tenant.md) — RLS enforcement check |
| `KVKKConsentLogFailure` | P0 | audit servis log kontrol + incident report |
| `ServiceDBSlow` | P1 | [postgres-pgbouncer.md](./postgres-pgbouncer.md) |
| `BurnoutPredictionAccuracyDrop` | P1 | [burnout-prediction.md](./burnout-prediction.md) |
| `SurveyResponseRateDrop` | P1 | [survey.md](./survey.md) |
| `BillingWebhookFail` | P1 | [billing.md](./billing.md) |
| `DiskPressure80` | P2 | ACA scale replica / PG storage autogrow |
| `CacheHitRateBelow60` | P2 | redis.bicep - memory policy review |

---

## 3. Escalation Chain

```
Tier 0: Automated remediation (auto-rollback, ACA restart)
  ↓ (fail)
Tier 1: Hasan — PagerDuty push → SMS (5 dk)
  ↓ (no ack in 15 dk)
Tier 2: Azure Monitor AG backup → e-posta + SMS tekrar
  ↓ (no ack in 30 dk)
Tier 3: ??? (solo founder — müşteri ile direkt iletişim başlat,
           satis@upcore.io'dan otomatik incident status mail)
```

**2026-Q3 hedefi:** Dış on-call destek (OpsGenie/Atlassian on-demand).

---

## 4. Incident Response Steps

### P0 — 5 dakikada

1. **Acknowledge** PagerDuty push (yanıtsız bırakmak = Tier 2 trigger).
2. **Channel aç** Slack `#inc-YYYYMMDD-<short>` (örn `#inc-20260424-pg-down`).
3. **Status page:** status.upcore.io'da "Investigating" incident create et.
   Manuel: <https://status.upcore.io/admin/incident/new>
4. **Dashboard kontrol:** <https://grafana.upcore.io/d/api-golden-signals>

### Mitigation

1. **Auto-rollback** başarısız olduysa manuel revision swap:
   ```bash
   az containerapp revision list --name upc-prod-<svc> -g upc-prod-rg
   az containerapp revision activate --name upc-prod-<svc> -g upc-prod-rg --revision <prev>
   ```
2. **DB rollback** — asla otomatik değil, her zaman ayrı PR + psql manuel.
3. **Feature flag** kapatma: Admin panel → Feature Flags → toggle off.

### Recovery

1. Status page "Monitoring" → "Resolved" geçir.
2. Post-mortem draft **24 saat içinde** (`ops/incidents/YYYY-MM-DD-<name>.md`).
3. Action items repo issue'ya dönüştür, 2 hafta içinde kapat.

---

## 5. Tooling

| Ne | Nerede |
|---|---|
| PagerDuty | `upcore.pagerduty.com` (P0 service + P1 service) |
| Slack | `#sre-incidents`, `#sre-alerts`, `#sre-noise` |
| Azure Monitor | Action Group `upc-prod-oncall-ag` (email + SMS Hasan) |
| Grafana | `grafana.upcore.io` (SSO via Clerk admin) |
| Status page | `status.upcore.io` (ayrı ACA region — westeurope down olsa da ayakta) |

---

## 6. Weekly Review

Her Pazartesi 10:00:
- Geçen haftanın P0/P1 incident'ları review
- Error budget burn rate (`observability/dashboards/business-slo.json`)
- Action item progress

---

## 7. KVKK İhlal Bildirimi (72 saat SLA)

KVKK Madde 12 uyarınca kişisel veri ihlali tespit edildiğinde:

1. **T+0h:** Slack `#inc-kvkk-YYYYMMDD` kanalı aç.
2. **T+2h:** DPO (kvkk@upcore.io) bilgilendir.
3. **T+24h:** Etkilenen veri sahipleri listesi çıkar (SQL query ile tenant_id bazlı).
4. **T+48h:** Hukuk danışmanı review.
5. **T+72h:** KVKK Kurul'a bildirim (`compliance/kvkk/ihlal-bildirim-template.md`).
6. **T+72h:** Etkilenen çalışan/kullanıcıya e-posta bildirim.

Template: `legal/templates/kvkk-breach-notification.md` (Phase 2 — 2026-Q3).

---

## 8. Referans

- [Azure Monitor Action Groups](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups)
- [PagerDuty integration v2 API](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgw-events-api-v2-overview)
- [Alertmanager routing tree](https://prometheus.io/docs/alerting/latest/configuration/#route)
- [KVKK İhlal Bildirim Rehberi (2022)](https://www.kvkk.gov.tr/)

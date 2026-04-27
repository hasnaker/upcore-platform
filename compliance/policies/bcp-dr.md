# Business Continuity & Disaster Recovery Plan

**ISO 27001 A.5.29-30, A.8.13-14 · SOC 2 A1.2-3**
**Versiyon:** 1.0 · 2026-04-22

## RTO / RPO Hedefleri

| Servis | RTO | RPO | Kanıt |
|---|---|---|---|
| Auth + API gateway | 30 dk | 0 (stateless) | Multi-AZ, warm geo-standby |
| PostgreSQL prod | 4 saat | 15 dk | PITR 35d + geo-replica |
| Blob storage (documents) | 1 saat | 1 saat | ZRS + versioning |
| Service Bus | 1 saat | 5 dk | Premium tier geo-DR |
| ML pipelines | 24 saat | 24 saat | Nightly retrain possible |
| Grafana dashboards | 4 saat | 24 saat | Config as code |

## BCP kapsam senaryoları
1. **Tek zone down** (Azure AZ failure) → otomatik failover, RTO 0.
2. **Tüm TR Central down** → NE geo-standby manuel promotion, RTO 4h.
3. **DB corruption** → PITR restore, RTO 2h.
4. **Ransomware** → immutable backup (Object Lock 30 gün), RTO 8h.
5. **Key personel kaybı** → break-glass docs `ops/BACKUP_RESTORE.md`, runbook.
6. **Uzun ofis erişimsizliği** → tüm iş 100% remote yapılabilir.

## Backup stratejisi
- **Tier 1 (WAL):** PostgreSQL continuous, 35d PITR.
- **Tier 2 (snapshot):** Weekly `pg_dump` → Azure Blob (geo-replicated).
- **Tier 3 (archive):** Monthly Object Lock 7 yıl (KVKK retention).
- **Test:** Quarterly restore drill — her drill bir random tenant'ı side DB'ye restore eder,
  row count + integrity check çalıştırır.

## Bildirim akışı (büyük arıza)
1. Status page (`status.upcore.app`) updated: **investigating**
2. Slack `#incidents` thread
3. PagerDuty → on-call SRE + CISO
4. > 15 dk sürerse: müşteri email (template)
5. > 1 saat sürerse: CEO + basın açıklaması (template)
6. Kapanışta: post-mortem + status update

## Review cadence
- Yıllık BCP review (scope + risk)
- Quarterly DR drill
- Monthly backup verification

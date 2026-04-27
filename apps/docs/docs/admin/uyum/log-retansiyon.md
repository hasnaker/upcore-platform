---
id: log-retansiyon
title: "Log retansiyon"
sidebar_position: 4
---

# Log retansiyon

Audit log + sistem log saklama süreleri.

## Log kategorileri

| Tür | Retention | Mevzuat |
|---|---|---|
| Audit log (WORM) | 7 yıl (Enterprise 10) | KVKK md. 12 |
| Login log | 3 yıl | SOC 2 |
| API access log | 1 yıl | Genel güvenlik |
| Error log | 6 ay | Debug |
| Performance metrics | 1 yıl | Kapasite planning |
| Webhook delivery log | 30 gün | Operasyon |

## Arşivleme stratejisi

- **Hot (son 30 gün):** Fast query, dashboard
- **Warm (30 gün - 1 yıl):** Normal query, slower
- **Cold (1 yıl+):** S3 Glacier, retrieve saat sürer
- **Frozen (7 yıl+):** Tape / glacier deep archive

## Export formatlar

- JSON (structured)
- CSV (reporting)
- Parquet (analytics)
- Encrypted zip (archive)

## KVKK uyumluluğu

- PII içeren log: pseudonymize (7 yıl sonra anonim)
- Çalışan veri indirme talebinde log dahil edilir (Madde 11/a)
- Silme talebinde log **silinmez** (yasal saklama gerekçesi) ama maskelenir

## Storage maliyet

- Hot: 1 TB = ~5 000 TRY/ay
- Warm: 1 TB = ~1 500 TRY/ay
- Cold: 1 TB = ~250 TRY/ay

Enterprise müşteriye büyük log sık ise warehouse export önerilir.

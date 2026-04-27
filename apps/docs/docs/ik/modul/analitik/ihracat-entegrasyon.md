---
id: ihracat-entegrasyon
title: "İhracat ve entegrasyon"
sidebar_position: 9
---

# İhracat ve entegrasyon

Analitik verilerinin dış sistemlere aktarımı.

## Desteklenen destinationlar

### BI araçları
- **Power BI** — DirectQuery / Import
- **Tableau** — Tableau Connector
- **Looker** — LookML model
- **Metabase** — SQL direct (read-only replica)
- **Amazon QuickSight** — S3 export

### Data warehouse
- **Snowflake** — Snowflake Connector
- **BigQuery** — BigQuery Transfer Service
- **Azure Synapse** — pipeline
- **Redshift** — COPY command

### Export formatlar
- CSV — günlük otomatik
- Parquet — büyük veri
- JSON — API-driven
- Excel — İK raporlama

## Export türleri

### 1. Tam export (full dump)
- Tüm veri snapshot
- Tipik nightly
- Tam tarih geçmişi

### 2. Delta export (incremental)
- Son N saat/gün
- Daha hızlı, daha küçük
- Timestamp-based

### 3. Streaming
- Real-time (< 1 dakika)
- Kafka, Kinesis
- Enterprise özellik

## API'lar

- **REST API:** paginated, bearer token
- **GraphQL:** esnek sorgu (beta)
- **Webhook:** event-driven push
- **SQL access:** read-only replica (Enterprise)

## KVKK uyumluluğu

Export öncesi:
- **Anonymization** (TCKN maskeleme, hash)
- **Field selection** (sadece gerekli alanlar)
- **Retention** (ihracat verilerinin silinme politikası)
- **Alt işleyici sözleşme** (KVKK md. 12)

## Audit log

Her export kayıt edilir:
- Kim
- Ne zaman
- Hangi veri kümesi
- Amacı
- Destination sistem

## Şifreleme

- Transit: TLS 1.3
- At-rest: AES-256-GCM
- Key management: Azure Key Vault / AWS KMS

## Sample SQL erişim

```sql
-- Pulse anonim agregat örneği
SELECT
  department_id,
  DATE_TRUNC('month', response_at) AS month,
  AVG(bat_total_score) AS avg_score,
  COUNT(*) AS n
FROM app.pulse_responses_anonymous
WHERE response_count >= 5  -- k-anonimlik
GROUP BY department_id, month
ORDER BY month DESC;
```

## Rate limit

- REST API: 1 000 req/dk (tenant başına)
- SQL erişim: 50 eş zamanlı sorgu
- Export: 10 GB/gün (Starter), 100 GB/gün (Enterprise)

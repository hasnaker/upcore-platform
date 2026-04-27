# UpCore ML — Retraining Pipeline

Bu dizin üç ML servisinin **aylık otomatik yeniden eğitilmesi** için
Airflow DAG + Azure ML pipeline konfigürasyonlarını içerir.

## Amaç

Eğitim bir kez yapılıp unutulmaz. Müşteri verisi geldikçe dağılımlar kayar,
model bayatlar. UpCore'un üç modeli:

1. **burnout-prediction** — LSTM (BAT-TR skor + event sequence → risk)
2. **psychometric-scoring** — rule-based (BAT/COPSOQ/UWES/UpCap/VIA skor)
3. **action-center (recommender)** — Thompson sampling contextual bandit

İkinci model rule-based olduğu için retraining gerektirmez; birinci ve
üçüncü modeller ayda bir kere yeni veriyle fine-tune edilir.

## Pipeline (Airflow DAG özeti)

```
┌─────────────┐   ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
│ 1. Snapshot │ → │ 2. Validate │ → │ 3. Train +   │ → │ 4. Canary   │
│   prod data │   │   (schema + │   │   evaluate   │   │   deploy    │
│             │   │    drift)   │   │              │   │   (10%)     │
└─────────────┘   └─────────────┘   └──────────────┘   └─────────────┘
                                                              │
                                                              ▼
                                                      ┌─────────────┐
                                                      │ 5. Promote  │
                                                      │  or rollback│
                                                      └─────────────┘
```

### Adım 1 — Snapshot

Azure PostgreSQL read-replica'dan son 12 ay burnout_risk + intervention
outcome verisini parquet olarak çeker.

### Adım 2 — Validate

- Row count > 1000 (az veri → training skipped)
- Feature drift (KS testi < 0.1 p-value)
- Label imbalance < 1:20

### Adım 3 — Train + evaluate

- LSTM: 50 epoch, early stop val_loss patience=5
- Bandit: offline replay on last 30d outcome data

Metrics log: Azure ML experiment tracking.

Accept criteria:
- AUC > previous + 0.01
- Calibration ECE < 0.05
- Latency p99 < 50ms inference

### Adım 4 — Canary

New model serves %10 traffic for 48h. Compare AUC + action acceptance
rate. Grafana dashboard: `upcore-ml-canary`.

### Adım 5 — Promote or rollback

SRE on-call + Data Science lead onay verir.

## Retraining Schedule

- Burnout: **1. Pazar 03:00 UTC**
- Bandit: **Her Salı 03:00 UTC** (daha sık, bandit ödül sinyali hızlı değişir)

## Feedback Loop

`intervention.outcome.recorded.v1` eventi → Service Bus subscription →
`feature_store.outcome` tablosuna yazılır. Bir sonraki eğitimde bandit
reward değerlerine katılır.

## Drift Monitoring

Günlük: Grafana `upcore-ml-drift` dashboard. Alert:
- Feature drift p-value < 0.01 → Slack P3
- Prediction distribution shift > %10 → Slack P2
- AUC degradation > %5 (7 günlük rolling) → PagerDuty P2

## Model Cards

`/ml-services/burnout-prediction/MODEL_CARD.md` — KVKK için her release'de
güncellenir. Adil değerlendirme, biased feature denetimi, veri kaynağı.

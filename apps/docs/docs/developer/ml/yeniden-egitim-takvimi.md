---
id: yeniden-egitim-takvimi
title: ML yeniden eğitim takvimi
sidebar_position: 5
---

# ML yeniden eğitim takvimi

UpCore ML modellerinin güncel kalması için düzenli retrain takvimi.

## Retrain cadence

| Model | Full retrain | Incremental update |
|---|---|---|
| burnout-prediction | Çeyreklik | Haftalık |
| jd-r-fit | Yarıyıllık | Aylık |
| intervention-recommendation | Sürekli (bandit) | Her vaka sonrası |
| churn-prediction | Çeyreklik | Haftalık |
| recommender (learning path) | Aylık | Günlük |

## Drift detection

Otomatik tetikleyiciler:
- **PSI** (Population Stability Index) > 0.25 → alarm
- **KS test p-value** < 0.01 → feature dağılım değişti
- **AUC drop** %5+ → performance drift
- **Prediction drift** > 2 standard deviation → output drift

Alarm → ML team incelemesi + acil retrain değerlendirmesi.

## Retrain süreçi

1. **Veri toplama:** Son 6 ay production veri
2. **Validation split:** 80/10/10 (train/val/test)
3. **Hyperparameter tuning:** Bayesian optimization
4. **Eğitim:** GPU cluster (Azure ML)
5. **Değerlendirme:** Performance + fairness (Fairlearn)
6. **Bias audit:** Demographic parity + equalized odds
7. **A/B testing (shadow mode):** 7 gün production'a paralel
8. **Kalibrasyon:** Platt scaling veya isotonic
9. **Model card güncellemesi:** Yeni versiyon yayımı
10. **Deployment:** Blue-green (geri alma mümkün)

## Rollback

Yeni model production'da sorun çıkarırsa:
- Anlık rollback (tek tık)
- Traffic switch blue → green
- Incident post-mortem

## Model sürüm kayıtları

- **GitHub:** Her retrain için release tag
- **MLflow:** Tüm deneyler + artifacts
- **Model Card:** Her sürüm için public doküman

## Şeffaflık

- Retrain takvimi public
- Performance trendi public (degradation halinde)
- Bias audit raporu her yıl Ocak
- Akademik yayın — UpCap-TR validation çalışması

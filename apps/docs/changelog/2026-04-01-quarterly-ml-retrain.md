---
slug: q2-ml-retrain
title: Q2 2026 ML modelleri retrain tamamlandı
authors: [ml-team]
tags: [ml, models]
date: 2026-04-01
---

Çeyreklik retrain süreci tamamlandı. Tüm modeller için performans iyileşmesi kaydedildi.

<!-- truncate -->

## Modeller

### burnout-prediction v2.1
- AUC-ROC: 0.76 → 0.78
- Brier score: 0.16 → 0.14
- Fairness: disparate impact 1.12 → 1.08 (daha iyi)
- [Model card](/docs/developer/ml/burnout-prediction-kart)

### jd-r-fit v1.3
- R²: 0.61 → 0.64
- MAE: 9.1 → 8.2
- [Model card](/docs/developer/ml/jd-r-fit-kart)

### intervention-recommendation v3.0
- Contextual bandit geçişi tamamlandı
- Ortalama Cohen's d: 0.41 → 0.47
- [Model card](/docs/developer/ml/intervention-recommendation-kart)

## Bias audit

Fairlearn + Aequitas ile yıllık audit Mart 2026 tamamlandı. Tespit edilen minor bias için düzeltici eğitim uygulandı. Detaylar: [Bias denetim sayfası](/docs/ik/modul/analitik/bias-denetimi).

## Sonraki retrain

Q3 retrain planı: 1 Temmuz 2026.

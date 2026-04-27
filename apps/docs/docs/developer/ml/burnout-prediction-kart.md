---
id: burnout-prediction-kart
title: "Model Card — Burnout Prediction v2.1"
sidebar_position: 2
---

# Model Card — Burnout Prediction v2.1

## Model detayları

- **Model adı:** burnout-prediction
- **Versiyon:** 2.1
- **Tarih:** 2026-04-15
- **Geliştirici:** UpCore ML Team
- **Kontakt:** ml-team@upcore.io
- **Tür:** Classification (binary — yüksek risk / değil)
- **Algoritma:** XGBoost Classifier + Platt scaling calibration
- **Framework:** Python 3.12, scikit-learn 1.4, xgboost 2.0

## Kullanım amacı

- **Birincil:** Pulse + özlük verilerinden 90 gün içinde tükenmişlik riski (BAT-TR ≥ 3.5) olasılığı tahmini
- **İkincil:** Retention risk tahmini (ayrılış olasılığı)
- **Kullanım dışı:**
  - İşten çıkarma kararı (KVKK Madde 22 yasak)
  - Tek başına zam/terfi kararı
  - Pozisyon atama

## Faktörler

### Demografik
- Cinsiyet: bias denetim değişkeni (model feature değil)
- Yaş: 5 bucket (18-25, 26-35, 36-45, 46-55, 56+)
- Bölge: Türkiye il gruplaması (7 coğrafi bölge)

### Mesleki
- Rol (IC / Manager / Director)
- Kıdem (ay)
- Departman

### Psikometrik
- BAT-TR puanı (son 3 ay ortalama)
- UWES-9 puanı
- JD-R denge skoru

## Performans metrikleri

| Metric | Değer | Std |
|---|---|---|
| AUC-ROC | 0.78 | 0.02 |
| Precision @ 90% recall | 0.62 | 0.03 |
| Recall @ 90% precision | 0.45 | 0.04 |
| Brier score (calibration) | 0.14 | 0.01 |
| F1 | 0.68 | 0.02 |

## Değerlendirme verileri

- **Test set:** 50 000 çalışan (20% holdout)
- **Source:** UpCore anonim agregat (2020-2025)
- **Ülke:** Türkiye
- **Sektör dağılımı:** Tech %30, finans %25, retail %15, üretim %15, kamu %15

## Eğitim verileri

- **Boyut:** 150 000 çalışan
- **Dönem:** 2020 Q1 - 2025 Q4 (5 yıl)
- **Etiketleme:** BAT-TR skor ≥ 3.5 → pozitif (30% base rate)
- **Ön işleme:** Missing imputation (median), outlier clipping (99th percentile), standart scaling

## Quantitative analiz

### Grup bazında AUC

| Grup | AUC |
|---|---|
| Kadın | 0.77 |
| Erkek | 0.79 |
| 18-35 yaş | 0.79 |
| 36-55 yaş | 0.78 |
| 56+ yaş | 0.71 (küçük n) |
| Tech sektör | 0.80 |
| Üretim sektör | 0.74 |

### Fairlearn sonuçları

- Disparate impact ratio (cinsiyet): 1.08 (acceptable, < 1.25)
- Equalized odds farkı: 0.03 (good)
- Demographic parity farkı: 0.05 (good)

## Etik hususlar

- **Risk:** Yanlış pozitif → çalışana gereksiz müdahale baskısı
- **Mitigasyon:** Tahmin tek başına karar değildir, İK uzmanı değerlendirir
- **Risk:** Tarihsel bias → devam eden ayrımcılık
- **Mitigasyon:** Fairness constraints eğitim sırasında, yıllık audit
- **Risk:** Data leakage (pulse anonim olsa bile agregat bireyi belirli yapabilir)
- **Mitigasyon:** k-anonimlik ≥ 5, differential privacy noise

## Öneriler ve uyarılar

- Model tahmini güven aralığı ile birlikte sunulur
- Çalışan kendi tahmin açıklamasını isteyebilir (SHAP, KVKK Madde 11/g)
- Yeni sektör / ülke için transfer öğrenme ayrı değerlendirme gerekir
- Retrain en az 3 ayda bir

## İzleme

- Production drift metric'leri (PSI, KS test)
- Aylık performans raporu
- Yıllık bias audit
- Model sürüm log: GitHub

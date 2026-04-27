---
id: tahmin-modelleri
title: "Tahmin modelleri"
sidebar_position: 8
---

# Tahmin modelleri

Geleceğe yönelik tahminler — geleceğe hazırlıklı olmak için.

## Tahmin türleri

### 1. Ayrılma tahmini
- 90 gün içinde kim ayrılacak?
- [Ayrılış risk tahmini](/docs/ik/modul/mobility/ayrilis-risk-tahmini) detayı

### 2. Tükenmişlik tahmini
- 6 ay içinde kimler kırmızı banda düşecek?
- Erken müdahale için

### 3. Performans tahmini
- Çeyrek sonu performans skoru?
- Risk yönetimi (PIP öncesi)

### 4. İşe alım ihtiyacı
- Önümüzdeki yıl kaç FTE gerekli?
- Departman büyümesi + ayrılma

### 5. Bütçe tahmini
- Personel maliyeti projeksiyon
- Zam + yeni işe alım + ayrılma etkisi

### 6. Eğitim ihtiyacı
- Hangi yetkinlik açıkları büyüyecek?
- Önerilen programlar

## Model tipleri

- **Time series:** ARIMA, Prophet, LSTM
- **Classification:** XGBoost, Random Forest (ayrılma, tükenmişlik)
- **Regression:** Elastic Net (performans skoru)
- **Clustering:** K-means, HDBSCAN (profil segmentasyonu)
- **Causal:** Double ML (müdahale etkisi)

## Uncertainty quantification

Tahminler nokta değeri değil, aralık:
- %50 güven aralığı
- %90 güven aralığı
- Scenario planning

## Kalibrasyon

- Brier score
- Reliability diagram
- Calibration curve

Miscalibrated model → yanıltıcı tahmin.

## Retrain sıklığı

- Kritik modeller: çeyrek
- Orta kritik: 6 ay
- Statik durumlar: yıllık
- Data drift tespiti → otomatik tetikleme

## Açıklanabilirlik

- **SHAP values** — her özelliğin tahmin üzerine etkisi
- **Feature importance** — genel
- **What-if analysis** — parametre değiştirme
- **Counterfactual explanation** — "ne değişse sonuç ters olurdu?"

Çalışan kendi tahmin açıklamasını isteyebilir (KVKK Madde 11/g).

## Etik sınırlar

- Hiçbir tahmin kendi başına karar değil
- İnsan yöneticisi değerlendirir
- Tahmin → retention aksiyonu (negatif karar değil)
- Bias denetim zorunlu

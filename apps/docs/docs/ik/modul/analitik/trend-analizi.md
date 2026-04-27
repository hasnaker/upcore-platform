---
id: trend-analizi
title: "Trend analizi"
sidebar_position: 7
---

# Trend analizi

Zaman serisi analizi — zaman içinde KPI değişimleri.

## Analiz türleri

### 1. Lineer trend
- Haftalık / aylık çizgi grafik
- Ortalama eğim
- Anlamlı mı (t-test)

### 2. Mevsimsellik
- Yıllık patern
- Aylık/çeyreklik sezon
- Dini-ulusal tatil etkisi
- Yaz tatili etkisi (izin sezonu)

### 3. Değişim noktası
- Önemli değişim nerede başladı?
- Statistical change point detection
- Olay ile ilişkilendirme (örn. yeni CEO atandı)

### 4. Anomali
- Beklenenden sapma
- Control chart (UCL/LCL)
- Bildirim tetikleme

### 5. Causal inference
- "X yapıldıktan sonra Y değişti"
- Correlational değil, causal
- Propensity score, IV, RDD

## UpCore araçları

### Zaman serisi grafiği
- Çizgi grafik + güven aralığı
- Hedef çizgisi
- Olay etiketleri

### Forecast
- Gelecek 3-6 ay projeksiyon
- ARIMA / Prophet / LSTM model
- Güven aralığı

### Decomposition
- Trend + seasonal + residual
- Seasonal adjustment
- Noise filtrasyonu

### Correlation matrix
- Hangi KPI'lar birlikte hareket ediyor?
- Lead/lag ilişkisi
- Causal hypothesis

## Data quality

Trend analizi için:
- **Minimum 12 ay veri** (mevsimsellik yakalanması için)
- **Tutarlı sorgu tanımı** (eş tanım)
- **Outlier temizleme** (data error kaldırma)
- **Missing data imputation** (interpolation)

## Yaygın hatalar

1. **Trend görmedi:** Noise içinde gerçek trend var ama gözardı edildi
2. **Trend gördü ama yok:** Rastgele noise'i trend sandı (confirmation bias)
3. **Seasonal karıştırma:** Yaz düşüşü normal, panik yapma
4. **Correlation vs causation:** İki değişken birlikte hareket eden mutlaka causal değildir

## Narrative layer

Trend grafiğinin yanında **hikaye**:
- "Q1'de bağlılık skorumuz 15% düştü. Eş zamanlı olarak 3 kıdemli müdürümüz ayrıldı. İki faktör bağlantılı olabilir."
- Kanıta dayalı anlatım

## Executive rapor dahil

Yıllık / çeyrek raporlarda trend bölümü:
- Top 3 iyileşen KPI
- Top 3 kötüleşen KPI
- Anomaliler ve açıklamalar
- Forecast

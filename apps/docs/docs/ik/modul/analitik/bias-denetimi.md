---
id: bias-denetimi
title: "Bias denetimi"
sidebar_position: 3
---

# Bias denetimi

Algorithmic fairness audit — her karar destek modeli için.

## Neden bias denetim?

- İnsan kararlarında bias var (proven, 100+ yıllık araştırma)
- ML modelleri insan verisinden öğrenir — bias'ı öğrenir
- İK kararları yasal olarak ayrımcılık yasağı altında (İş K. md. 5, KVKK md. 22)
- Yeterince büyük şirketlerde yıllık audit yasal gereksinim

## Protected attributes

UpCore bu özniteliklere göre denetim yapar:
- **Cinsiyet**
- **Yaş** (18-25, 25-35, 35-45, 45-55, 55+)
- **Etnik köken** (gönüllü veri, az şirket)
- **Engellilik** (evet/hayır)
- **Annelik durumu** (kadın, 35 yaş altı)

## Denetim metriği

### 1. Disparate Impact (DI)
```
DI = P(olumlu sonuç | protected group) / P(olumlu sonuç | referans grup)
```

- DI < 0.80 → kritik bias (4/5 kural, ABD EEOC)
- DI 0.80-1.25 → normal
- DI > 1.25 → ters bias (gen. az, ama kontrol)

### 2. Equalized Odds
False positive rate + false negative rate grupları arasında eşit olmalı.

### 3. Demographic Parity
Seçim olasılıkları gruplar arasında eşit olmalı.

### 4. Calibration
Skorlar gruplar arasında eşit kalibre edilmiş olmalı.

## Hangi kararlarda denetim?

UpCore otomatik her karar için:
- İşe alma (ATS)
- Zam / terfi
- Bonus
- PIP (performans iyileştirme)
- Müdahale seçimi (Thompson sampling)
- Succession pool
- Öğrenme yatırımı
- Fesih

## Raporlama

Her çeyrek:
- Protected attribute × karar matrisi
- DI hesapları
- Anomali işaretleme
- Root cause analizi
- Düzeltme önerileri

## Düzeltme aksiyonları

Bias tespit edildiğinde:
- **İnsan kararları:** Eğitim, bilinçlendirme, blind review
- **ML modeller:** Yeniden eğitim (fairness constraints ile), feature düzeltme, post-processing
- **Süreç:** Karar verme protokolü revize (örn. panel chat ile karar)

## Fairness/accuracy trade-off

- Fairness constraint → doğruluk %3-7 düşer
- UpCore default: fairness > accuracy (etik öncelik)
- Shadow mode: her iki versiyon karşılaştır, sonuç yayımla

## Audit raporu yayını

- Yıllık public rapor (KVK Kurulu önerisi)
- Anonim agrega — rakip bilgisi yok
- Sektör için benchmark oluşturur

## Yasal çerçeve

- İş Kanunu Madde 5 — ayrımcılık yasağı
- KVKK Madde 22 — otomatik karar yasağı (insan onayı olmadan)
- AB EU AI Act (2024+) — yüksek riskli AI sistemler için audit zorunluluğu

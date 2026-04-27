---
id: roi-hesabi
title: "ROI hesabı"
sidebar_position: 4
---

# ROI hesabı

İK yatırımlarının iş sonuçlarına getirisini hesaplama.

## İK modül başına ROI

### Sürdürme (pulse)
- Yatırım: yıllık lisans + İK zamanı
- Kazanç: azalan tükenmişlik → daha düşük ayrılma oranı → işe alım tasarrufu

### Koruma (müdahale)
- Yatırım: müdahale maliyeti (koç/psikolog/eğitim)
- Kazanç: Cohen's d ≥ 0.4 → performans artış + devamsızlık azalış

### Performans (OKR + 360)
- Yatırım: modül + yönetici zamanı
- Kazanç: hedeflere ulaşma + şirket geliri artış

### Mobility (succession)
- Yatırım: gelişim programları + eğitim
- Kazanç: dış işe alım tasarrufu + kritik pozisyon risk azaltma

## Hesap yöntemleri

### 1. A/B test (rigorous)
- Rastgele 2 gruba bölme
- Müdahale var/yok
- Sonuçları karşılaştırma
- Etik zor: "kontrol grubuna bir şey yapılmasın" iK kabul etmez

### 2. Propensity score matching
- Müdahale alan vs eşdeğer profil almayanları eşleştir
- Karşılaştırma
- İstatistiksel dengeleme

### 3. Regression discontinuity
- Eşik altı/üstü karşılaştırma
- Ayrı tedavi grupları
- Causal inference

### 4. Difference-in-differences
- Önce/sonra × müdahale/kontrol
- Zaman trendi etkisini arındır

## Genel formül

```
ROI = (Toplam kazanç - Toplam yatırım) / Toplam yatırım × 100
```

Örnek: Tükenmişlik müdahale programı
- Yıllık yatırım: 500 000 TRY
- Tasarruf: %15 daha az ayrılma × 50 çalışan × 50 000 TL işe alım = 375 000 TRY
- Devamsızlık azalış: %10 × 500 gün × 2 000 TL = 100 000 TRY
- Performans artış: ölçülmesi zor, ihtiyatlı %2-3 tahmin

ROI = (475 000 - 500 000) / 500 000 = -%5 (yıl 1)
Yıl 2+: ROI = ~%50-100 (kurulum maliyeti amorti eder)

## Süre etkisi

- Kısa vade: yatırım > kazanç (nadir ROI negatif)
- Orta vade (1-3 yıl): break-even
- Uzun vade (3+ yıl): güçlü ROI

Sabırlı olmak — İK yatırımının ROI'si yazılım geliştirme ROI'sinden yavaş.

## Sektör benchmark

Şirket başarısızlık durumları:
- Yüksek turnover sektörleri (retail, hospitality): %8-15
- Düşük turnover sektörleri (teknoloji, finans): %4-8
- Kamu: %2-5

Her %1 turnover azalışı: 1-2% gelir artışı.

## Raporlama

CFO için çeyrek rapor:
- Her modül × yatırım × kazanç
- Toplam ROI
- Gelecek yıl tahmin

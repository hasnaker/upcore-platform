---
id: ilk-pulse-anketi
title: "İlk pulse anketi — oluştur, gönder, yorumla"
sidebar_position: 2
---

# İlk pulse anketi — oluştur, gönder, yorumla

15 dakikalık kurulum sonrası ilk pulse anketinizi özelleştirelim.

## 1. Şablon seçimi

**Sürdürme > Yeni anket**

Üç önceden hazır şablon:

| Şablon | Süre | Madde sayısı |
|---|---|---|
| BAT-12-TR | 2 dk | 12 |
| UWES-9 (iş bağlılığı) | 1.5 dk | 9 |
| COPSOQ-III-TR (psikososyal) | 5 dk | 23 |

**İlk anket için BAT-12-TR** öneririz (Koçak 2022 Türkiye geçerlilik çalışması).

## 2. Kitle seçimi

- **Tüm şirket** (200+ çalışan için başlangıçta önerilen)
- **Sadece pilot departman** (opsiyon — 30 kişi eşik altı)

Küçük ekiplerde k-anonimlik (≥5) sağlamak için departman < 5 kişi olanlar **üst bölüm**e dahil edilir.

## 3. Özel soru ekleme

Şablonun sonuna 2 özel soru ekleyin (maksimum 3):

```yaml
- "İş-yaşam dengem genel olarak iyi." (1-5 Likert)
- "Şirketin değerleri benimle uyumlu." (1-5 Likert)
```

:::warning
Özel sorular bilimsel geçerlilikten yoksundur. Trend takip için kullanışlı ama **tek başına karar vermeyin**.
:::

## 4. Gönderim

- **Gönderim saati:** Salı 10:00 (en yüksek cevap oranı saati — internal analytics)
- **Hatırlatıcı:** 3 gün sonra, 7 gün sonra
- **Son teslim:** 14 gün

## 5. Sonuçları yorumlama

Anket kapandıktan sonra:

1. **Sürdürme > Sonuçlar > Son anket**
2. Heatmap (departman × madde): kırmızı hücreler anında görünür
3. JD-R boyut özet: Talepler skoru + Kaynaklar skoru
4. BAT-TR genel skor (ulusal norm percentile ile)

### İlk yoruma örnek

> Pazarlama departmanı cross-departmental collaboration maddesinde 2.3/5 (kritik).
> Ulusal ortalama 3.6/5.
> Aksiyon: İK → Pazarlama yöneticisi ile 1-1 yaparak gözlem doğrulaması, ardından **ekip-bazlı koçluk** müdahalesi başlat.

## Haftalık ritim

- **Haftada 1 saat** sonuç incelemeye ayır
- Kırmızı band görülen ekipler için **1 ay içinde** aksiyon başlat
- 3 ay sonra trend raporu üret (başlangıç → şimdi)

**Sonraki adım:** [İlk müdahale başlatma](./ilk-mudahale)

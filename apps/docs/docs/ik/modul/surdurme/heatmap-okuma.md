---
id: heatmap-okuma
title: Heatmap okuma
sidebar_position: 4
---

# Heatmap okuma

Heatmap, **departman × madde** matrisinde her hücreyi ortalama skor veya **JD-R boyut agregası** olarak renklendirir.

## Renk kodları

| Renk | Skor aralığı (1–5 Likert) | Yorum |
|---|---|---|
| 🟢 Koyu yeşil | 4.5 – 5.0 | Üstün |
| 🟢 Açık yeşil | 3.8 – 4.5 | İyi |
| 🟡 Sarı | 3.0 – 3.8 | Orta — dikkat |
| 🟠 Turuncu | 2.5 – 3.0 | Risk |
| 🔴 Kırmızı | 1.0 – 2.5 | Kritik |

## Okuma sırası

1. **Satır bazlı (madde):** Hangi konu şirket genelinde zayıf?
2. **Sütun bazlı (departman):** Hangi departman risk altında?
3. **Hücre bazlı:** Hangi departman × madde kesişimi kritik?

## Normative karşılaştırma

Her hücrede iki sayı görürsünüz:
- **Ham skor:** Departmanın ortalaması
- **Percentile:** Türkiye normunun hangi yüzdelik diliminde (UpCore anonim agregat)

Örnek: "Pazarlama: 3.2 (percentile 28)" — **ulusal ortalamaya göre alt %28'de**.

## Trend gösterimi

- **▲** Son periyoda göre iyileşme (≥0.15 standart sapma)
- **▼** Son periyoda göre kötüleşme (≥0.15 standart sapma)
- **■** Anlamlı değişim yok

## Filtreler

- Departman (hiyerarşik)
- Kıdem (0-1 yıl, 1-3, 3-5, 5+)
- Yaş aralığı (18-24, 25-34, 35-44, 45+)
- Cinsiyet (agrega değil, bias denetim için)

:::warning
Filtre kombinasyonu küçük alt grup oluşturursa (n < 5) sistem cevabı gizler.
:::

## Tıklama aksiyonları

- Hücre tıklaması → madde detayı + serbest metin yorumlar (maskelenmiş)
- Departman adı → o departmanın zaman serisi
- "Aksiyon al" butonu → Thompson sampling müdahale önerisi

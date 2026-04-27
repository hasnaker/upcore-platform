---
id: ilk-mudahale
title: "İlk müdahale — kırmızı band → Thompson → consent → plan"
sidebar_position: 3
---

# İlk müdahale — kırmızı band → Thompson → consent → plan

Pulse sonuçlarında kırmızı banda düşen bir çalışan / ekip için adım-adım müdahale akışı.

## 1. Sinyal doğrulama

Tek bir pulse sonucu yeterli değildir. Öncesinde kontrol:

- **Ardışık 2–3 pulse** aynı yönde bozulma var mı?
- **Alt-boyut** hangi? (iş yükü, özerklik eksikliği, sosyal destek yokluğu...)
- **Dış etken** var mı? (yeni proje, ayrılan üst yönetici, reorg)

## 2. Thompson sampling önerisi

**Koruma > Müdahale önerileri** sayfasında sistem top 3 öneri listeler:

```
1. İş yükü kalibrasyon atölyesi (8 hafta)  — güven: %72
2. Stres yönetimi kısa eğitim (4 hafta)    — güven: %65
3. 1-1 koçluk (12 hafta)                    — güven: %58
```

:::info Thompson sampling nedir?
Her müdahalenin geçmiş etkisi (Cohen's d) + istatistiksel belirsizliği birleştiren bir **multi-armed bandit** algoritması. Keşif (exploration) + en iyi seçim (exploitation) dengesi kurar.
:::

## 3. Çalışan consent akışı

**Koruma > Yeni müdahale**:

1. Çalışan seçin (arama ile)
2. Müdahale türü (Thompson önerisinden 1. sırayı seçmek zorunda değilsiniz — klinik judgement üstündür)
3. Consent metni oluşturulur (şablon + müdahale özelliklerine göre customize)
4. Çalışana e-posta ile consent linki gider
5. Çalışan "Onaylıyorum / Reddediyorum / Ek bilgi istiyorum" seçeneklerinden birini seçer

:::danger KVKK uyumu
Açık rıza olmadan müdahale **başlatılamaz**. Sistem blokaj kurar.
:::

## 4. Plan oluşturma

Consent alındıktan sonra:

- Süre seçimi: 4 / 8 / 12 hafta
- Yönetici onayı (bütçe + zaman)
- İzleme noktaları: haftada 1 check-in
- Çıktı ölçüm ölçeği: müdahale türüne göre otomatik seçilir (BAT-TR, UWES-9)

## 5. İzleme

Her check-in:
- Mini pulse (3 soru)
- Yönetici gözlem notu
- Müdahale sağlayıcı (koç/psikolog) notu

## 6. Etki ölçümü

Süre sonunda Cohen's d hesabı:

| d | Anlam |
|---|---|
| 0.2 | Küçük etki |
| 0.5 | Orta etki (klinik anlamlı) |
| 0.8 | Büyük etki |

## Sonuç kayıtları

Sonuç Thompson sampling modelinin **posterior**ına beslenir — bir sonraki benzer vaka için öneri güvenilirliği günceller. Bu, sisteminizin **öğrenen** bir İK platformu olması demektir.

**Sonraki adım:** [Yıl sonu değerlendirme tam senaryosu](./yil-sonu-degerlendirme)

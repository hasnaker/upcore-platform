---
id: plan-takibi
title: Plan takibi
sidebar_position: 5
---

# Plan takibi

Consent sonrası plan oluşturulur. İK'nın görebileceği plan detayları.

## Plan yaşam döngüsü

```
DRAFT → CONSENT_PENDING → ACTIVE → COMPLETED / CANCELLED
```

| Durum | Açıklama |
|---|---|
| DRAFT | İK taslak oluşturdu, consent gitmedi |
| CONSENT_PENDING | Çalışana rıza formu gönderildi |
| ACTIVE | Rıza alındı, müdahale başladı |
| COMPLETED | Süre doldu, etki ölçümü yapıldı |
| CANCELLED | Geri çekildi veya İK iptal etti |

## Plan detay sayfası

İK'nın görebileceği alanlar:
- Müdahale adı + kategorisi
- Başlangıç tarihi + süre
- Sağlayıcı (iç/dış koç, anonim psikolog referans ID)
- Bütçe (müdahale maliyeti + harcama)
- İzleme takvimi (check-in tarihleri)
- Özet notlar (sağlayıcı raporu)

İK'nın **göremeyeceği** alanlar:
- Çalışanın birebir terapi notları
- Psikolog klinik değerlendirmesi (ayrı sistemde, hekim-danışan gizliliği)
- Çalışan ile sağlayıcı arasındaki spesifik konuşmalar

## Check-in noktaları

- **Week 1:** Başlangıç kontrolü — süreç rahat mı?
- **Week 4 / Hafta 4:** Ara etki (mini pulse)
- **Week 8:** Yarı yol
- **Week 12 (max):** Kapanış

Her check-in'de:
1. Mini pulse (3 BAT-TR maddesi)
2. Sağlayıcı 1-2 cümle özet (İK görebilir)
3. Yönetici 1-2 cümle gözlem (İK görebilir)
4. Çalışan memnuniyet sorusu (anonim agregat)

## Plan düzenleme

Plan başladıktan sonra ayarlanabilir:
- Süre uzatma (maks 12 hafta — sonrası yeniden plan)
- Sağlayıcı değişimi (consent gerektirir)
- Bütçe değişimi (yönetici onayı)

## Plan iptal

İptal nedenleri:
- Çalışan consent geri çekti
- İK klinik eskalasyon kararı (sağlayıcı öneriyor)
- Çalışan şirketten ayrılıyor
- Sağlayıcı sürece uygun olmadığını raporladı

Her iptal **audit log** kaydı ile kayıt altına alınır.

## Bildirimler

Plan durumu değiştikçe otomatik bildirimler:
- Çalışan: her önemli değişim
- Yönetici: sadece zaman/bütçe etkisi
- İK: her durum değişimi
- CHRO: sadece eskalasyonlar

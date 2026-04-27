---
id: silme-talebi
title: Silme talebi (unutulma hakkı)
sidebar_position: 3
---

# Silme talebi (unutulma hakkı)

KVKK Madde 7 ve Madde 11/(e) kapsamında silinme isteme hakkınız vardır.

## Silinebilir veriler

| Kategori | Silinebilir mi? | Saklama gerekçesi |
|---|---|---|
| Pulse cevapları | Evet | — |
| 360 yorumları | Evet | — |
| İzin kayıtları | Hayır, 5 yıl | Vergi Usul Kanunu |
| Bordro | Hayır, 5 yıl + SGK 10 yıl | SGK mevzuat |
| İş sözleşmesi | Hayır, 5 yıl | Türk Borçlar Kanunu 146 |
| Kimlik fotokopisi | Hayır, 5 yıl | SGK |

:::note
Yasal saklama süreleri sona erene kadar bazı veriler silinemez, ancak **maskelenir** (TCKN yerine hash).
:::

## Akış

1. **KVKK > Silme talebi**
2. Silinmesini istediğiniz veri kategorilerini seçin
3. Kimlik doğrulama: TCKN + MFA kodu
4. İK'ya talep düşer (30 gün SLA)
5. İK karar verir — onay / kısmi onay / ret (gerekçeli)
6. Onay durumunda: silme + 3. taraf alt işleyicilere bildirim

## Otomatik akış

Bazı silme talepleri otomatik çalışır:
- Profil fotoğrafı silinmesi
- Bildirim geçmişi temizlenmesi
- Bağlantılı olduğunuz tüm pulse cevaplarının anonimleştirilmesi

## İtiraz

Red kararına **30 gün içinde** itiraz edebilir, KVK Kurulu'na şikayet başvurusu yapabilirsiniz.

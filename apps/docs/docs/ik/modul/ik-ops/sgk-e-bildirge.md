---
id: sgk-e-bildirge
title: "SGK e-Bildirge"
sidebar_position: 6
---

# SGK e-Bildirge

Sosyal Güvenlik Kurumu'na aylık bildirge üretimi.

## Bildirge türleri

### APB (Aylık Prim ve Hizmet Belgesi)

- Zorunluluk: her ay, en geç ayın 23'üne kadar
- İçerik: her sigortalı için çalışılan gün + prim matrahı
- Format: XML (SGK şema)

### İGB (İşe Giriş Bildirgesi)

- Zorunluluk: işe girişten en geç 1 gün önce
- İçerik: yeni çalışan kimlik + işe giriş tarihi + meslek kodu

### İAB (İşten Ayrılış Bildirgesi)

- Zorunluluk: ayrılışın 10 gün içinde
- İçerik: ayrılış tarihi + sebep kodu + ihbar/kıdem detayı

## XML üretimi

UpCore otomatik:

1. **Ay sonu pencere:** 28. günde hesap önizleme
2. **İK onay:** Hesap inceleme
3. **XML oluştur:** Butona basma
4. **Dijital imza:** Şirket mali müşavir e-imzası
5. **Yükleme:** SGK e-Bildirge portalına (manuel veya API)
6. **Onay:** SGK sistem geri bildirim
7. **Kayıt:** PDF + JSON arşive

## Prim oranları 2026

| Tür | İşveren | İşçi | Toplam |
|---|---|---|---|
| SGK emeklilik | %11 | %9 | %20 |
| Genel sağlık sigortası | %7.5 | %5 | %12.5 |
| İşsizlik | %2 | %1 | %3 |
| **Toplam** | **%20.5** | **%15** | **%35.5** |

Kısa vadeli sigorta (iş kazası): sektör bazlı %0.5-3.

## İşveren teşvikleri

- **5510 5. md teşviği:** 5 puan indirim (%20.5 → %15.5)
- **6111 teşvik:** Genç istihdam (18-29 yaş)
- **İlave istihdam:** yeni işçi — ilk yıl SGK primi devlet karşılar
- **ARGE çalışanları:** %90 stopaj iadesi

UpCore otomatik uygun teşvik hesabı önerir.

## Yanlış bildirim — düzeltme

- **Düzeltme bildirgesi:** APB'nin tekrarı
- **Ek bildirim:** Eksik prim
- **İade:** Fazla ödenen prim geri
- SGK e-Bildirge portal üzerinden

## Erken ayrılış bildirimi (İAB)

İşten ayrılış sebep kodları (aktarım için):
- 1: İstifa
- 2: İşveren fesih (bildirimli)
- 3: İşveren fesih (bildirimsiz)
- 4: İşçinin çıkması (haklı)
- 5: Karşılıklı anlaşma
- 6: Süresi dolma (belirli süreli)
- 7: Ölüm
- 8: Emeklilik
- 9: Askerlik
- 10: Gebe/lohusa izin sonu ayrılma

Her sebep için farklı kıdem tazminatı hakkı!

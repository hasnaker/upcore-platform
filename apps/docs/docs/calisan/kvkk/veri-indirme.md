---
id: veri-indirme
title: Verilerimi indirme
sidebar_position: 2
---

# Verilerimi indirme

KVKK Madde 11/(a) ve (b) kapsamında size ait tüm kişisel verilerin bir kopyasını indirebilirsiniz.

## Adımlar

1. Hesap > **KVKK Haklarım**
2. **Veri indirme talebi** butonu
3. Talep kaydı oluşturulur — size e-posta ile onay kodu gelir
4. Onay sonrası sistem arka planda arşiv hazırlar (**1–24 saat**)
5. Hazır olunca e-posta ile **şifreli indirme linki** gönderilir
6. 7 gün geçerli, 3 başarısız parolada kilitlenir

## Arşiv içeriği

- `profile.json` — temel özlük bilgileri
- `pulse-responses.json` — sizin verdiğiniz pulse cevapları (agrega değil)
- `surveys-360.json` — aldığınız ve verdiğiniz 360 değerlendirmeler
- `leave-records.csv` — izin geçmişi
- `audit-log.json` — hesabınıza yapılan erişimlerin logu (kim, ne zaman)
- `consents.json` — verdiğiniz açık rızaların tarihçesi
- `README.md` — her dosyanın ne içerdiğini açıklayan rehber

## Format

**Makine okunabilir** JSON + CSV (Madde 11 uyumlu "taşıma" hakkı). Başka bir İK sistemine aktarmak isterseniz destek ekibinden dönüşüm şablonu isteyebilirsiniz.

## Ayrılış sonrası

Şirketten ayrıldıktan sonra **30 gün** içinde veri indirme talebi gönderebilirsiniz.
Sonrasında saklama politikasına göre bazı veriler silinir (SGK için 10 yıl, bordro için 5 yıl vb.).

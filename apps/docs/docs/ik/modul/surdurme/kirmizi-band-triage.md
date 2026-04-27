---
id: kirmizi-band-triage
title: Kırmızı band triage — İK protokolü
sidebar_position: 5
---

# Kırmızı band triage — İK protokolü

Bir departman kırmızı banda düştüğünde İK olarak izleyeceğiniz protokol.

## Tetikleyici

Aşağıdaki koşullardan **herhangi biri**:
- BAT-TR toplam skor ≥ 3.0 (kritik eşik, Koçak 2022 Türkiye normu)
- Ardışık 2 pulse %15+ kötüleşme
- JD-R "talep/kaynak" oranı 2.0'ı aştı
- ML burnout-prediction model %35+ 90-gün risk skoru

## Adım 1 — Doğrulama (24 saat)

- Sinyal yanlış alarm mı? Son 1 hafta tek olay mı (örn. grev, CEO açıklaması)?
- Yönetici ile 30 dk konuş — gözlem kanıtı iste
- Üst yönetici (departman yöneticisinin üstü) farkında mı?

## Adım 2 — Hipotez üretimi (48 saat)

Klasik JD-R hipotezleri:

1. **İş yükü artışı** — son 90 gün FTE çıkış var mı?
2. **Özerklik kaybı** — yeni mikro-yönetim eğilimi?
3. **Tanıma eksikliği** — son kutlama / ödül ne zamandı?
4. **Rol belirsizliği** — reorg veya yeni yönetici?
5. **İletişim kopukluğu** — ekip toplantısı sıklığı?

## Adım 3 — Müdahale seçimi (1 hafta)

- **Koruma** modülünde Thompson sampling öner
- 3 top-K öneriyi incele
- Klinik judgement ile 1 tanesini seç
- Grup müdahalesi vs. bireysel müdahale kararı ver

## Adım 4 — Çalışan consent'i (3-5 gün)

- Hangi çalışanlar etkilenecek?
- Her biri için consent formu oluşturulur
- Gönderim: e-posta + in-app bildirim
- Süre: 5 iş günü karar

## Adım 5 — Uygulama başlangıcı

- Consent veren çalışanlar için plan oluştur
- Yöneticiyi bilgilendir (ne olacak, ne zaman, bütçe etkisi)
- Müdahale sağlayıcıyı (koç/psikolog) ata
- 4/8/12 haftalık check-in takvimi otomatik kurulur

## Adım 6 — İzleme

Her check-in'de:
- Mini pulse (3 madde)
- Müdahale sağlayıcı raporu
- Yönetici gözlem notu
- ML modeli risk skoru güncellemesi

## Adım 7 — Kapanış

- Süre sonunda Cohen's d hesaplanır
- d ≥ 0.5 → başarı — vaka kapanır, posterior güncellenir
- d < 0.2 → başarısız — alternatif müdahale veya eskalasyon

## Eskalasyon kriterleri

- 2 ardışık başarısız müdahale
- Intihar / kendine zarar verme sinyali → **derhal** psikolog referansı
- Hukuki risk (mobbing iddiası) → hukuk departmanı
- Yönetici kaynaklı sistematik sorun → CHRO bilgi

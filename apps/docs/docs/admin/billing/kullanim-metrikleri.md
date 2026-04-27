---
id: kullanim-metrikleri
title: "Kullanım metrikleri"
sidebar_position: 3
---

# Kullanım metrikleri

## Ölçülen metrikler

- **Aktif çalışan sayısı** — son 30 günde girişi olan
- **API call sayısı** — REST + GraphQL + Webhook
- **Storage** — yüklenen dosya + database
- **Bandwidth** — çıkış trafiği (export, API response)
- **Pulse gönderim sayısı** — ay boyunca
- **ML inference** — tahmin + recommendation call

## Sınırı aşma

- **Soft limit:** %85 tüketilince uyarı
- **Hard limit:** %100'de yeni request blok
- **Overage:** Enterprise için elastic (ek ücretli)

## Raporlama

- **Günlük:** Dashboard'da canlı
- **Aylık:** Fatura öncesi özet
- **Yıllık:** Trend analizi

## Optimize için

- Pulse sıklığı düşür (2 haftada 1 → aylık)
- API cache kullan (client tarafı)
- Export limitini değişken (küçük batch)
- ML inference batched (bireysel değil)

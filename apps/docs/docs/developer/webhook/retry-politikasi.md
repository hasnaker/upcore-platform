---
id: retry-politikasi
title: "Retry politikası"
sidebar_position: 3
---

# Retry politikası

## Algoritma

Başarısız webhook için **exponential backoff**:

| Deneme | Bekleme |
|---|---|
| 1 | 0 s (ilk deneme) |
| 2 | 1 s |
| 3 | 4 s |
| 4 | 16 s |
| 5 | 64 s (~1 dk) |
| 6 | 256 s (~4 dk) |
| 7 | 1024 s (~17 dk) |
| 8 | 4096 s (~68 dk) |
| 9 | 16 384 s (~4.5 saat) |
| 10 | 65 536 s (~18 saat) |

Toplam denemeler 48 saat içinde biter.

## Başarı koşulu

- HTTP 200-299 → başarı
- HTTP 3xx → redirect follow (1 kez)
- HTTP 4xx → **retry yok** (client sorunu)
- HTTP 5xx → retry
- Timeout (30 sn) → retry
- Connection error → retry

## Circuit breaker

- 5 dakika içinde > %50 fail → endpoint 5 dakika devre dışı
- Sonraki "half-open" test
- Başarılıysa → normal
- Başarısızsa → 10 dakika devre dışı

## Manuel retry

Admin panel > Webhook > Delivery > "Retry now"

## Çöken consumer

Tüm retry'lar bittikten sonra:
- Delivery status → "permanent_failure"
- Alert → admin e-posta
- 30 gün sonra history'den silinir

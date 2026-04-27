---
id: bordro-hesaplama
title: "Bordro hesaplama"
sidebar_position: 5
---

# Bordro hesaplama

Türkiye ücret bordrosu hesaplama motoru.

## Temel hesap adımları

1. **Brüt maaş** (sözleşmeye göre)
2. **SGK primi kesintisi** (işçi payı %14)
3. **İşsizlik sigortası** (%1)
4. **Damga vergisi** (%0.759)
5. **Gelir vergisi** (dilim bazlı)
6. **AGİ (Asgari Geçim İndirimi)** — 193 s.K. md. 32, 2022+ kaldırıldı ama geçmiş hesaplar için mevcut
7. **Net maaş** = brüt - kesintiler + AGİ (varsa)

## Gelir vergisi dilimleri 2026

(2026 yılı için varsayılan tablodur — mevzuat değiştikçe güncellenir)

| Dilim | Tutar (TL) | Oran |
|---|---|---|
| 1 | 0 - 258 000 | %15 |
| 2 | 258 000 - 570 000 | %20 |
| 3 | 570 000 - 2 700 000 | %27 |
| 4 | 2 700 000 - 5 500 000 | %35 |
| 5 | 5 500 000+ | %40 |

## SGK prim taban/tavan

- Taban: asgari ücret (2026: 33 000 TL brüt)
- Tavan: asgari ücretin 7.5 katı (2026: 247 500 TL)

Tavanı aşan maaşta SGK sadece tavan üzerinden hesaplanır.

## Özel kesintiler

- **Sendika aidatı** (opsiyonel, %1-2)
- **BES (Bireysel Emeklilik)** — %3 otomatik dahil, opt-out mümkün
- **İcra kesintisi** — mahkeme kararı (maksimum %25)
- **Nafaka** — kanun kararı

## Ek ödemeler

- **Fazla mesai** = saatlik × 1.5 (normal), × 2 (hafta tatili), × 2 (resmi tatil)
- **Gece zammı** = saatlik × 1.5 (20:00 - 06:00 arası)
- **Prim ve ikramiye**
- **Yol, yemek** (belirli sınır altında gelir vergisi muaf)
- **BES işveren payı** (çalışan brüt üzerinden hesaplanmaz)

## Minimum ücret koruması

- Asgari ücret altında net maaş olamaz
- Prim-ikramiye ile yükseltme
- Asgari ücret destek (2022-2026 geçici) — hesap otomatik

## Bordro çıktısı

- **Bordro** (İş Kanunu md. 37) — çalışana aylık verilir
- Format: PDF, dijital imza, zaman damgası
- Kanunda gereken 15 alan dolu olmalı

## Hata kontrolü

UpCore otomatik:
- Net maaş < asgari ücret → alarm
- Gelir vergisi dilim atlaması → kontrol
- SGK taban/tavan sınır kontrolü
- Kesinti toplam > brüt → kritik

## Yıllık ücret bildirgesi

- Her yıl Şubat — yıllık ödenen ücret bildirim (form 1001/1003)
- Gelir İdaresi Başkanlığı'na gönderim (SGK e-beyanname portal)
- Çalışanın yıllık gelir vergisi beyannamesi için girdidir

---
id: ilk-modul-secimi
title: "İlk modül seçimi"
sidebar_position: 4
---

# İlk modül seçimi

Tenant için hangi modüller aktif olacak?

## Modül bağımlılıkları

- Sürdürme → temel (çoğu tenant açar)
- Koruma → Sürdürme gerekli
- Performans → bağımsız
- Mobility → Performans (9-kutu için) önerilir
- Geliştirme → bağımsız
- İK Ops → bordro için gerekli
- Analitik → tüm diğerlerinin verisi
- KVKK/GRC → zorunlu (50+ çalışan)

## Plan-modül matrisi

| Plan | Dahil modüller |
|---|---|
| Starter | Sürdürme + İK Ops |
| Growth | + Performans + Koruma |
| Enterprise | + Mobility + Geliştirme + Analitik + KVKK/GRC |
| Enterprise Plus | Hepsi + advanced features |

## Modül sonradan ekleme

Plan yükseltildiğinde otomatik ekleme. Orta plan değişiminde veri tutulur.

---
id: versiyonlama
title: "API versiyonlama"
sidebar_position: 3
---

# API versiyonlama

Breaking change yönetimi.

## Semantic versioning

- **Major (v1 → v2):** Breaking change
- **Minor (v1.1 → v1.2):** Yeni özellik, backward compatible
- **Patch (v1.1.1 → v1.1.2):** Bug fix

URL'de sadece major version.

## Destek süresi

- **Current version:** Full destek
- **Previous major:** 12 ay destek sonrası deprecated
- **Deprecated:** 6 ay warning, sonra 410 Gone

Örnek timeline:
- 2026-01: v2 çıktı → v1 deprecated
- 2026-07: v1 warning header
- 2027-01: v1 kapatıldı

## Breaking change örnekleri

- Field rename (eski → yeni)
- Required field ekleme
- Response structure değişimi
- Endpoint path değişimi
- Auth scheme değişimi

## Migration rehberi

Her major version çıkışında:
- Migration guide yayımlanır
- Code sample diff
- Automated migration script (mümkünse)
- Support team 1-1 destek (Enterprise)

## Deprecation header

Deprecated endpoint:
```
Deprecation: true
Sunset: Wed, 01 Jan 2027 00:00:00 GMT
Link: <https://docs.upcore.io/migration/v1-to-v2>; rel="alternate"
```

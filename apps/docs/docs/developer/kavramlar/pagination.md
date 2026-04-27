---
id: pagination
title: "Pagination (sayfalama)"
sidebar_position: 6
---

# Pagination (sayfalama)

Büyük veri setlerini sayfa sayfa çekme.

## Cursor-based (önerilen)

```
GET /api/v1/employees?limit=50&cursor=eyJpZCI6ImVtcF8xMjMifQ==
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6ImVtcF8xNzMifQ==",
    "has_more": true
  }
}
```

- Cursor opaque (base64 encoded)
- Stable sort (data değişse bile skip yok)
- Performanslı (indexed lookup)

## Offset-based (legacy)

```
GET /api/v1/employees?limit=50&offset=100
```

- Kolay ama büyük offset yavaş
- Data değişiminde drift riski (eklemeler/silmeler)
- 1000+ kayıt için önerilmez

## Limit

- Default: 20
- Max: 100 (çoğu endpoint)
- Büyük batch için async export kullan

## Toplam sayı

`total_count` opsiyonel — hesabı pahalı:
```
GET /api/v1/employees?include=total_count
```

Varsayılan dönmez. İstenirse ayrı hesap yapılır.

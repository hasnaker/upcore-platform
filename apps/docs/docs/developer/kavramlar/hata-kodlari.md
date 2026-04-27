---
id: hata-kodlari
title: "Hata kodları"
sidebar_position: 4
---

# Hata kodları

HTTP status + error code + message.

## HTTP status

| Code | Anlam |
|---|---|
| 200 | Başarı |
| 201 | Oluşturuldu |
| 202 | Kuyruğa alındı (async) |
| 204 | İçerik yok (delete) |
| 400 | Kötü istek |
| 401 | Auth eksik |
| 403 | Yetki yetersiz |
| 404 | Bulunamadı |
| 409 | Çelişki |
| 422 | İşlenemez (validation) |
| 429 | Rate limit aşıldı |
| 500 | Sunucu hatası |
| 503 | Geçici olarak kullanılamıyor |

## Hata response formatı

```json
{
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "Çalışan bulunamadı",
    "request_id": "req_abc123",
    "field_errors": {
      "email": "E-posta formatı geçersiz"
    }
  }
}
```

## Error code prefix listesi

- `AUTH_` — kimlik doğrulama
- `VALIDATION_` — input validation
- `PERMISSION_` — yetkilendirme
- `RATE_LIMIT_` — rate limit
- `RESOURCE_` — kaynak bulunamadı
- `CONFLICT_` — çelişki (duplicate, stale update)
- `EXTERNAL_` — 3. taraf servis hatası
- `INTERNAL_` — sunucu hatası

## Retry logic

| Status | Retry? | Backoff |
|---|---|---|
| 429 | Evet | Retry-After header |
| 500 | Evet | Exponential (max 3) |
| 502, 503, 504 | Evet | Exponential (max 5) |
| 4xx (diğer) | Hayır | — |

## Request ID

Her request response'unda `X-Request-Id` header — destek ticketı için paylaşın.

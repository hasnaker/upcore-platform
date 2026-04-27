---
id: rate-limit
title: "Rate limit"
sidebar_position: 2
---

# Rate limit

## Limitler

| Plan | API/dakika | API/gün | Concurrent |
|---|---|---|---|
| Starter | 100 | 10 000 | 10 |
| Growth | 500 | 100 000 | 30 |
| Enterprise | 1000 | 1 000 000 | 100 |
| Enterprise Plus | Sınırsız | 10 000 000 | 500 |

## Response header

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 453
X-RateLimit-Reset: 1713873600
Retry-After: 42
```

## 429 Too Many Requests

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Çok fazla istek",
    "retry_after_seconds": 42
  }
}
```

## Algoritma

- Sliding window (Redis)
- IP + tenant_id + endpoint kombinasyonu
- Burst allow (%20 kısa vadeli aşım)

## Optimizasyon

- Cache kullan (response cache header destekleniyor)
- Bulk endpoint kullan (tek tek yerine)
- Webhook consume et (polling yerine)
- Rate limit header'ı izle (retry logic client tarafında)

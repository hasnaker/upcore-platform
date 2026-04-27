---
id: webhook-konfigurasyon
title: "Webhook konfigürasyonu"
sidebar_position: 2
---

# Webhook konfigürasyonu

Event-driven entegrasyon için.

## Desteklenen olaylar

- `employee.created`
- `employee.terminated`
- `pulse.completed`
- `intervention.started`
- `intervention.completed`
- `okr.updated`
- `review.submitted`
- `audit.anomaly_detected`
- `payroll.run_completed`
- `gdpr.request_received`

Tam liste: [Webhook olayları](/docs/developer/webhook/olaylar).

## Endpoint kurulumu

**Admin > Operasyon > Webhooks > + Yeni**

1. Endpoint URL (HTTPS zorunlu)
2. Olay seçimi (subset)
3. Secret (imzalama için)
4. Retry politikası (aşağıda)
5. Test payload gönderim

## Retry politikası

Başarısız webhook için:
- Maks 10 deneme
- Exponential backoff: 1s, 4s, 16s, 64s, 256s, ...
- 48 saat sonra drop + alarm
- Circuit breaker: 50% fail → 5 dakika kapalı

## İmzalama

HMAC-SHA256 ile:
```
X-UpCore-Signature: t=1234567890,v1=abc123...
```

Doğrulama (Node.js):
```js
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${timestamp}.${JSON.stringify(body)}`)
  .digest('hex');
```

## Idempotency

Her webhook'ta `X-UpCore-Delivery-Id` header vardır. Consumer retry durumunu bu ID ile ayırt etmeli.

## Payload örneği

```json
{
  "event": "pulse.completed",
  "tenant_id": "tnt_abc123",
  "timestamp": "2026-04-23T14:35:00Z",
  "data": {
    "pulse_id": "pls_xyz789",
    "completion_rate": 0.87
  }
}
```

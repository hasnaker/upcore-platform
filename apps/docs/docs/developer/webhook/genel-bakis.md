---
id: genel-bakis
title: "Webhook genel bakış"
sidebar_position: 1
---

# Webhook genel bakış

Olaylara (event) dayalı push bildirimler.

## Push vs Pull

UpCore webhook push modeli:
- Olay oluşunca sunucu → client'a HTTP POST
- Polling yerine
- Düşük latency (saniyeler)
- Server kaynak tasarrufu

## Kurulum

**Admin > Operasyon > Webhooks > + Yeni**

- Endpoint URL (HTTPS)
- Olay filtreleri (subset)
- Signing secret
- Test delivery

## Konfigürasyon örneği

```json
{
  "url": "https://your-app.com/upcore-webhook",
  "events": ["pulse.completed", "intervention.started"],
  "secret": "whsec_abc...",
  "active": true,
  "retry_policy": {
    "max_attempts": 10,
    "backoff": "exponential"
  }
}
```

## Delivery görünürlük

**Admin > Webhooks > Teslimat geçmişi**

Her delivery için:
- Timestamp
- Response status
- Response time
- Payload
- Next retry (varsa)

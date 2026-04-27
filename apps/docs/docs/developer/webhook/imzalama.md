---
id: imzalama
title: "Webhook imzalama ve doğrulama"
sidebar_position: 2
---

# Webhook imzalama ve doğrulama

## İmzalama algoritması

HMAC-SHA256:
```
signature = HMAC_SHA256(secret, timestamp + "." + body)
```

## Header

```
X-UpCore-Signature: t=1713873600,v1=abc123def456...
X-UpCore-Delivery-Id: wh_xyz789
X-UpCore-Timestamp: 1713873600
```

## Doğrulama (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhook(req, secret) {
  const signatureHeader = req.headers['x-upcore-signature'];
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).slice(2);
  const signature = parts.find(p => p.startsWith('v1=')).slice(3);

  // 5 dk replay koruması
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error('Timestamp too old');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(req.body)}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )) {
    throw new Error('Invalid signature');
  }
  return true;
}
```

## Python doğrulama

```python
import hmac
import hashlib

def verify_webhook(body, timestamp, signature, secret):
    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{body}".encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

## Replay attack koruması

- Timestamp header 5 dakikadan eski ise red
- Delivery ID ile idempotency

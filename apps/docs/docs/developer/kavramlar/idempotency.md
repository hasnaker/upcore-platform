---
id: idempotency
title: "Idempotency (tekrar güvenlik)"
sidebar_position: 5
---

# Idempotency (tekrar güvenlik)

Aynı isteği iki kez göndermenin güvenli olması.

## Neden gerekli?

- Network timeout — istek gitti mi gitmedi mi?
- Tekrar deneme logic — client retry
- Webhook delivery — duplicate olabilir

## Desteklenen endpoint'ler

POST / PUT / PATCH endpoint'leri:
- Ödeme işlemleri
- Müdahale planı oluşturma
- Çalışan import (CSV)
- Webhook delivery

## Nasıl kullanılır?

```
POST /api/v1/payments
Idempotency-Key: <unique-uuid>
```

- UUID v4 önerilir
- 24 saat saklanır
- Aynı key ile 2. istek → cached response döner

## Garanti

- Aynı key + aynı body → aynı response (200-299)
- Aynı key + farklı body → 409 Conflict
- 24 saat sonra key expire → yeni istek gibi işlenir

## Client SDK

UpCore SDK'lar otomatik idempotency key üretir:
- JavaScript: `upcore.payments.create({...})` — auto key
- Python: aynı
- Go: aynı

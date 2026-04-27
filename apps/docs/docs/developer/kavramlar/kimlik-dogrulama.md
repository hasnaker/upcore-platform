---
id: kimlik-dogrulama
title: "Kimlik doğrulama"
sidebar_position: 2
---

# Kimlik doğrulama

UpCore API'si iki tür kimlik doğrulama destekler.

## 1. Clerk JWT (user-facing)

Çalışanın kendi adına API çağırması için:
```
Authorization: Bearer <clerk_jwt_token>
```

Clerk tarafından üretilen JWT:
- RS256 imza
- 1 saat geçerli (refresh otomatik)
- Payload: user_id, tenant_id, roles, permissions

API Gateway Clerk public key ile doğrular.

## 2. API anahtarı (machine-to-machine)

Servisler arası veya kendi uygulamanızdan:
```
Authorization: Bearer upc_sk_live_abc123...
```

API key format:
- Prefix: `upc_sk_live_` (production) veya `upc_sk_test_` (test)
- 32 karakter random

## Scope

Her request için token doğrulanır + permission kontrol:
- `employees:read` — çalışan listesi
- `pulses:write` — anket oluşturma
- `admin:*` — tam yetki (admin role)

## Hata kodları

- 401 — token eksik / invalid
- 403 — token geçerli ama scope yetersiz
- 404 — kaynak tenant için erişilebilir değil

## Refresh

Clerk JWT otomatik refresh (frontend SDK). API key manual rotation (90 günde 1 önerisi).

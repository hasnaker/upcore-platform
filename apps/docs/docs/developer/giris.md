---
id: giris
title: Geliştirici rehberine hoş geldiniz
slug: /developer/giris
sidebar_position: 1
---

# Geliştirici rehberine hoş geldiniz

UpCore platformunu kendi sistemlerinizle entegre etmek için gereken her şey.

## Quick links

- [API genel bakış](./api/genel-bakis)
- [Authentication akışı](./kavramlar/kimlik-dogrulama)
- [Webhook olayları](./webhook/olaylar)
- [Rate limit](./api/rate-limit)
- [Hata kodları](./kavramlar/hata-kodlari)
- [ML model kartları](./ml/model-kartlari)

## Temel bilgiler

- **Base URL:** `https://api.upcore.io`
- **Auth:** Bearer JWT (Clerk uyumlu) veya API anahtarı
- **Format:** JSON (UTF-8)
- **Versiyonlama:** URL path (`/api/v1/`, `/api/v2/`)
- **Rate limit:** 1000 req/min (Starter), 10 000 req/min (Enterprise)

## Hızlı başlangıç — curl

```bash
curl -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     https://api.upcore.io/api/v1/employees
```

## SDK

- [JavaScript / TypeScript](./sdk/javascript)
- [Python](./sdk/python)
- [Go](./sdk/go)

## Test ortamı

Sandbox: `https://api.sandbox.upcore.io` — gerçek veri değil, rate limit sınırsız, özgürce deneyebilirsiniz.

## Destek

- **Teknik:** `developers@upcore.io`
- **Discord:** [upcore-dev](https://discord.gg/upcore-dev) (20 dk SLA)
- **GitHub issues:** [upcore/upcore-platform](https://github.com/upcore/upcore-platform/issues)

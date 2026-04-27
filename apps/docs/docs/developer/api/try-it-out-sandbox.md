---
id: try-it-out-sandbox
title: "Try it out sandbox"
sidebar_position: 4
---

# Try it out sandbox

Her API endpoint sayfasında "Try it out" butonu.

## Sandbox environment

- Base URL: `https://api.sandbox.upcore.io`
- Auth: auto-provided sandbox API key
- Data: test tenant + 50 mock çalışan
- Rate limit: sınırsız
- Reset: her gece UTC 00:00'da data reset

## Kullanım

1. API dokümantasyon sayfasında endpoint'e git
2. **Try it out** butonu
3. Parametreler otomatik örnek değerle doldurulur
4. **Execute** → response görünür
5. Curl command copy

## Sandbox data

Test tenant içinde:
- 50 çalışan (fake name, random TCKN)
- 5 departman
- 3 ay geriye pulse verisi
- 2 aktif müdahale planı
- 10 OKR

Hepsi mock — gerçek kişi / şirket verileri yok.

## Playground özellikleri

- Request history (son 20)
- Response inspect (headers, body, timing)
- Code generation (curl, Python, JavaScript, Go)
- Save request (favorites)
- Share link (deep-link to specific request)

## Geçiş: sandbox → production

- API key değişimi: `upc_sk_test_...` → `upc_sk_live_...`
- Base URL: `sandbox.upcore.io` → `api.upcore.io`
- Response format identical
- Production rate limit aktif

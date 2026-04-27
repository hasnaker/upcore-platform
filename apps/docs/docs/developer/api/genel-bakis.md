---
id: genel-bakis
title: "API genel bakış"
sidebar_position: 1
---

# API genel bakış

UpCore REST API'si 17 servise bölünmüştür. Her servisin kendi OpenAPI 3.1 spec'i vardır.

## Base URL'ler

- Production: `https://api.upcore.io`
- Staging: `https://api.staging.upcore.io`
- Sandbox: `https://api.sandbox.upcore.io`
- Local: `http://localhost:8080` (api-gateway)

## Servis-spesifik endpoint'ler

Gateway arkasındaki her servis kendi path prefix:
- `/api/v1/auth/*` → auth service
- `/api/v1/employees/*` → employee service
- `/api/v1/pulses/*` → survey service
- `/api/v1/interventions/*` → intervention service
- ...

Tam liste: [Servis API'leri sidebar'ı](./auth)

## Versioning

- URL path: `/api/v1/`, `/api/v2/`
- Semantic versioning
- Breaking change = major version bump
- Backward compat: eski versiyon 12 ay destek

## Content type

- Request + response: `application/json; charset=utf-8`
- File upload: `multipart/form-data`
- Stream: `text/event-stream` (ör. uzun süren işler)

## Locale

- `Accept-Language` header: `tr-TR,en;q=0.9`
- Response field `message` localize edilmiş
- Date format: ISO 8601 UTC

## "Try it out" sandbox

Her endpoint sayfasında **"Try it out"** butonu:
- Sandbox environment
- Rate limit: sınırsız
- Test data prefab
- Auth: sandbox API key otomatik

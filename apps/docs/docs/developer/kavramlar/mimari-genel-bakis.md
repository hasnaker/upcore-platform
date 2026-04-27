---
id: mimari-genel-bakis
title: "Mimari genel bakış"
sidebar_position: 1
---

# Mimari genel bakış

UpCore platformu microservice mimarisi üzerine kurulu.

## Yüksek seviye diagram

```
[Frontend: Next.js 15] → [API Gateway (Go)] → [17 mikroservis]
                                             ↓
                                   [PostgreSQL 16 + pgvector]
                                             ↓
                                   [ML servisleri (Python FastAPI)]
```

## Servisler

| Servis | Dil | Sorumluluk |
|---|---|---|
| api-gateway | Go | Tek giriş noktası, auth, rate limit, routing |
| auth | Go | Clerk webhook, JWT validation, RBAC |
| tenant | Go | Tenant yönetimi, billing, feature flag |
| employee | Go | Çalışan CRUD |
| organization | Go | Departman hiyerarşi |
| leave | Go | İzin yönetimi |
| document | Go | Dosya yönetim (sözleşme, belgeler) |
| survey | Go | Pulse anket |
| assessment | Go | Psikometrik değerlendirme |
| intervention | Go | Müdahale yönetim |
| performance | Go | OKR, 360, 9-kutu, PIP |
| mobility | Go | İç ilan, succession |
| ats | Go | İşe alım pipeline |
| notification | Go | Multi-channel bildirim |
| bordro | Go | Maaş bordrosu + SGK |
| billing | Go | Stripe/İyzico + plan |
| audit | Go | Audit log WORM |

## Dış bağımlılıklar

- **PostgreSQL 16 + pgvector** — primary store
- **Redis** — cache, pub/sub, rate limit
- **Azure Blob Storage** — file storage
- **Clerk** — auth provider
- **Stripe / İyzico** — ödeme
- **SendGrid** — e-posta
- **Iletimerkezi** — SMS (Türkiye)
- **Bunny.net / Azure CDN** — statik asset
- **ML Services (Python FastAPI):** psychometric-scoring, burnout-prediction, recommendation, action-center

## Deploy

- **Kubernetes** (Azure AKS)
- Turbo monorepo (Next.js + Go services)
- Helm chart + ArgoCD
- GitHub Actions CI
- Blue-green deployment

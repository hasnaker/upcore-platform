# Upcore Platform

> Türkiye'nin ilk bilim-temelli İK platformu — JD-R, Job Crafting, BAT-TR tabanlı.

## 📋 Hızlı Başlangıç

```bash
# 1. Node 20 + pnpm 9 kurulu olmalı
nvm use 20
corepack enable
corepack prepare pnpm@9.12.0 --activate

# 2. Bağımlılıkları yükle
pnpm install

# 3. .env dosyasını oluştur
cp .env.example .env.local

# 4. Docker servislerini başlat (PostgreSQL, Redis)
pnpm services:up

# 5. Database'i migrate + seed et
pnpm db:migrate
pnpm db:seed

# 6. Development mode
pnpm dev
```

## 🏗 Monorepo Yapısı

```
upcore-platform/
├── apps/                    Frontend uygulamalar
│   ├── web/                 Next.js 15 — ana web app
│   └── admin/               Next.js 15 — admin panel
├── packages/                Paylaşılan paketler
│   ├── design-system/       @upcore/design-system
│   ├── types/               @upcore/types
│   ├── api-client/          @upcore/api-client
│   └── utils/               @upcore/utils
├── services/                Go microservices (16 adet)
│   ├── api-gateway/         GraphQL/REST gateway
│   ├── auth/                Authentication + session
│   ├── tenant/              Tenant management
│   ├── employee/            Employee CRUD
│   ├── organization/        Org chart + departments
│   ├── leave/               İzin yönetimi
│   ├── document/            Belge yönetimi
│   ├── ats/                 Applicant tracking
│   ├── assessment/          Assessment delivery
│   ├── survey/              Pulse surveys
│   ├── intervention/        Intervention catalog
│   ├── mobility/            İç rotasyon + career paths
│   ├── notification/        Email/Slack/SMS
│   ├── audit/               Audit log
│   ├── performance/         OKR + review + calibration
│   └── bordro/              Payroll + SGK domain
├── ml-services/             Python FastAPI ML services (4)
│   ├── psychometric-scoring/  JD-R, BAT, UpCap, Strengths, JCS
│   ├── burnout-prediction/    LSTM model
│   ├── recommendation/        Intervention matcher
│   └── action-center/         Priority ranking engine
├── infrastructure/          IaC + DevOps
│   ├── azure/               Bicep templates
│   ├── kubernetes/          K8s manifests (if needed)
│   └── github-actions/      CI/CD workflows
├── database/                SQL migrations + seeds
├── tests/                   Playwright E2E suites
└── scripts/                 Build/deploy scripts
```

## ✅ Release Guard Komutları

```bash
# E2E smoke (Playwright)
pnpm test:e2e

# Web API direct-DB surface guard
pnpm check:web-api-db
```

## 🛠 Tech Stack

- **Frontend:** Next.js 15, TypeScript 5.5, Tailwind CSS v4, shadcn/ui
- **Backend:** Go 1.23 (services), Python 3.12 (ML)
- **Database:** PostgreSQL 16 + pgvector
- **Cache:** Redis 7
- **Messaging:** Azure Service Bus
- **LLM:** Azure OpenAI (GPT-4o)
- **Cloud:** Microsoft Azure
- **Deployment:** Azure Container Apps
- **Observability:** Azure Monitor + App Insights + Sentry

## 📐 Scientific Foundation

Upcore scientific foundation verified against peer-reviewed literature:
- **JD-R Model** — Demerouti et al. 2001, meta-analyses by Crawford 2010, Lesener 2019
- **Burnout** — BAT-TR (Koçak, Gençay & Schaufeli 2022)
- **JD-R Pulse** — COPSOQ-III Turkish (Şahan et al. 2019)
- **Job Crafting** — Wrzesniewski & Dutton 2001, JCS (Tims, Bakker, Derks 2012)
- **Strengths** — VIA taxonomy (Peterson & Seligman 2004)
- **Engagement** — UWES-9 (Schaufeli et al. 2006)
- **PsyCap** — UpCap-TR custom (built on CPC-12, Lorenz et al. 2016, CC-BY 4.0)

**NO Mind Garden (PCQ) dependency · NO copyright risk**

Full foundation: `/architecture/research/SCIENTIFIC_FOUNDATION_VERIFIED.md`

## 🚀 Build Phases

V1 launch: ~10 weeks, 8 phases. Detailed plan:
`/architecture/execution-plan/MASTER_EXECUTION_PLAN.html`

## 📝 License

Private — © 2026 Upcore Teknoloji A.Ş.

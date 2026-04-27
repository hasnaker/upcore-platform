# apps/status — UpCore Status Page

**Domain:** `https://status.upcore.io`
**Stack:** Next.js 15 → Azure Static Web Apps (region: `swedencentral`)
**Why separate region:** Ana platform (westeurope) down olsa bile status page
ayakta kalmalı. Bu bilinçli bir "different cloud / different region" kararıdır.

---

## Deploy

Otomatik: `main` branch push → `.github/workflows/deploy-status.yml`
Manuel tetik: `gh workflow run deploy-status.yml`

Altyapı: `infrastructure/azure/modules/status-app.bicep` (Azure Static Web Apps Free tier)

---

## Cloudflare CNAME Kurulumu

Cloudflare DNS → upcore.io → yeni CNAME:

```
Type:   CNAME
Name:   status
Target: upc-prod-status-swa.azurestaticapps.net
TTL:    Auto
Proxy:  DNS only (gri bulut — SWA kendi SSL'i ile)
```

SWA cname-delegation ile domain'i doğrular (~5-15 dk).

---

## Local Development

```bash
pnpm --filter @upcore/status dev
# → http://localhost:3002
```

---

## Özellikler

- Uptime gösterge (30d sparkline)
- Incident timeline (son 30 gün)
- Planlı bakım takvimi
- 17 servis + 2 ML + 5 entegrasyon bileşen durumu
- RSS / Atom feed
- E-posta abonelik (SendGrid)

## Not

Status page **ayrı** bir repo olabilir (compliance separation için).
2026-Q3 kararı: `status-page` repo'sunu ayrı sub-tree'ye çıkartmak bir opsiyon.
Şu an mono-repo içinde tutuluyor ama deploy hedefi ayrı.

---

## Detay

- Deploy workflow: [.github/workflows/deploy-status.yml](../../.github/workflows/deploy-status.yml)
- Bicep modül: [infrastructure/azure/modules/status-app.bicep](../../infrastructure/azure/modules/status-app.bicep)
- Runbook: [docs/runbook/status.md](../../docs/runbook/status.md)
- On-call: [docs/runbook/on-call-procedures.md](../../docs/runbook/on-call-procedures.md)

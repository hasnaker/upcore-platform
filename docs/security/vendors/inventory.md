# Vendor / Sub-processor Inventory

**Owner:** Procurement + CISO
**Version:** 1.0 · **Last reviewed:** 2026-04-23 · **Review cadence:** annual + on change
**Paired policy:** POL-06

Legend: **T1** = tier 1 (holds customer data) · **T2** = tier 2 (internal data) · **T3** = tier 3 (no data)

## Production infrastructure (T1)

| Vendor | Purpose | Region | Cert / Attestation | DPA | SCC | Annual review |
|--------|---------|--------|--------------------|-----|-----|---------------|
| Microsoft Azure | Compute, AKS, PostgreSQL, Blob, Key Vault | EU-North + EU-West | SOC 2 Type II · ISO 27001 · ISO 22301 · ISO 27017 · ISO 27018 | ✅ Online DPA | ✅ | 2026-Q1 |
| Clerk | Authentication + SSO + MFA + Passkey | US | SOC 2 Type II | ✅ Signed | ✅ Module 2 | 2026-Q1 |
| Stripe | Payments + invoicing | EU + US | PCI-DSS L1 · SOC 2 Type II | ✅ | ✅ | 2026-Q1 |
| Postmark (ActiveCampaign) | Transactional email | EU | SOC 2 Type II | ✅ | ✅ | 2026-Q2 |
| Azure OpenAI | LLM inference (private endpoint) | EU-Sweden | SOC 2 Type II · Microsoft Responsible AI | ✅ | n/a (EU) | 2026-Q2 |

## Observability & security (T1)

| Vendor | Purpose | Region | Cert | DPA | Notes |
|--------|---------|--------|------|-----|-------|
| Datadog | Metrics, logs (PII scrubbed), APM | EU | SOC 2 Type II · ISO 27001 · PCI-DSS | ✅ | Log scrubbing rules audited quarterly |
| Sentry | Error tracking | EU | SOC 2 Type II | ✅ | `beforeSend` hook removes PII |
| Cloudflare | WAF + DDoS (edge) | Anycast | ISO 27001 · SOC 2 · PCI-DSS | ✅ | Zero-trust-proxy for admin |
| Crowdstrike Falcon (EDR) | Endpoint detection | US | SOC 2 Type II · FedRAMP | ✅ | Workforce endpoints only |
| Snyk | SCA / SAST | EU | SOC 2 Type II · ISO 27001 | ✅ | No source code retained |

## Business SaaS (T2)

| Vendor | Purpose | Cert | DPA | Notes |
|--------|---------|------|-----|-------|
| Google Workspace | Email, Drive, Calendar | SOC 2 Type II · ISO 27001/17/18 | ✅ | Internal only |
| Linear | Engineering PM | SOC 2 Type II | ✅ | No customer PII |
| Notion | Docs / wiki | SOC 2 Type II | ✅ | No customer PII |
| 1Password | Password manager | SOC 2 Type II | ✅ | Team vault; break-glass docs stay physical |
| Slack | Messaging | SOC 2 Type II · ISO 27001 | ✅ | Message retention 90 days |
| HackerOne | Bug bounty (phase 2) | SOC 2 Type II · ISO 27001 | pending | Q3 2026 |

## Business SaaS — HR / Finance (T2)

| Vendor | Purpose | Cert | DPA | Notes |
|--------|---------|------|-----|-------|
| Lanteria HR | HRIS | SOC 2 Type II | ✅ | Employee master records |
| Paraşüt | Accounting | ISO 27001 | ✅ | TR financial compliance |
| HireRight | Background checks | SOC 2 Type II | ✅ | Pre-hire only; retention 90 days |

## Penetration testing (T2, periodic engagement)

| Vendor | Engagement | Region | Cert | Date | Report |
|--------|-----------|--------|------|------|--------|
| Biznet Bilişim | Web + API + mobile pentest | TR | CREST · OSCP team | 2026-Q2 (planned) | `compliance/pentest/2026-Q2/` |
| NCC Group | Red team + social engineering | UK/US | CREST · PCI ASV | 2026-Q4 (planned) | `compliance/pentest/2026-Q4/` |

## AI tool approval (T1/T2 depending on data)

| Vendor | Purpose | Scope | Notes |
|--------|---------|-------|-------|
| Anthropic Claude Team | Engineering productivity (no PII) | T2 | UpCore workspace; zero-retention option set |
| Azure OpenAI | Product ML features | T1 | Private endpoint + content filter; DPIA on file |
| GitHub Copilot | Code assist (no secrets, no PII) | T2 | Filters enabled; corp audit log on |

## Non-compliant (T3, no data)
- Font / icon CDNs (Google Fonts → self-hosted to avoid EU log exposure).
- Documentation publishing (Vercel for marketing site only — no customer data).

## Changes log

| Date | Change | Approver |
|------|--------|----------|
| 2026-04-23 | Initial inventory published | CISO |
| | | |

## Notification discipline
Any addition, removal, or region change triggers a customer-facing update at `/trust` 30 days in advance (per DPA §3).

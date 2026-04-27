# Data Classification and Handling Policy

**ID:** POL-05 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** DPO
**Review cadence:** annual · **Frameworks:** SOC 2 CC6.7 · ISO 27001 A.5.12–A.5.14 · KVKK md. 6, 10, 12

## 1. Purpose
Define data classes, handling requirements, and retention for each class.

## 2. Classes
| Class | Examples | Storage | Transit | Access | Retention |
|-------|----------|---------|---------|--------|-----------|
| **Public** | Marketing site, docs.upcore.io | Any | TLS optional | Anyone | Indefinite |
| **Internal** | Architecture diagrams, roadmap | UpCore tenant | TLS 1.3 | Employees | 3 years |
| **Confidential** | Source code, pricing, contracts | GitHub, SharePoint | TLS 1.3 + auth | Need-to-know | 7 years post-contract |
| **Restricted (PII)** | Employee names, TCKN, salary, survey responses, burnout scores | Encrypted DB (pgcrypto AES-256) + RLS | TLS 1.3 + mTLS internal | Least privilege + audit | KVKK retention schedule |
| **Highly Restricted (SPI)** | Health flags, mental-health intervention notes, biometric, children | pgcrypto column + `audit.events` trigger mandatory | TLS 1.3 + mTLS | Explicit consent + DPIA | Legal minimum |

## 3. Labelling
- Data Studio / warehouse tables must have `classification` column metadata.
- Documents watermarked with class in header.
- Confluence / Notion pages carry class tag.

## 4. Handling rules
- **Restricted / SPI:** never logged in plaintext (structured logger redacts by field name).
- **Restricted / SPI:** never leaves EU-North without DPA + SCC.
- **Screenshots / demos:** masked (see `apps/web/src/lib/privacy/redaction.ts`).
- **Generative AI:** no Restricted/SPI to any LLM except Azure OpenAI private endpoint within UpCore tenant.
- **USB / removable media:** banned for Restricted+.
- **Printing:** banned for SPI; restricted printing requires DPO approval.

## 5. Retention
Implemented in PostgreSQL by `scripts/retention-cron.sh` (nightly) driven by `app.retention_policies` table. Legal holds override retention (see POL-13).

## 6. Disposal
- **Digital:** cryptographic erase (rotate CMK in Key Vault) + row-level delete.
- **Physical:** certified shredding (bin service) with certificate retained 3 years.

## 7. Cross-border transfer
- Default residency: EU-North (Stockholm).
- AB data must stay in EU. TR data may reside in EU-North (adequacy via KVKK SCC).
- Sub-processor list in `compliance/subprocessors.md`; each has DPA.

## 8. Audit and evidence
- Annual data map refresh (RoPA).
- Quarterly classification audit on new tables (ADR review checklist).
- DPO signoff on every DPIA.

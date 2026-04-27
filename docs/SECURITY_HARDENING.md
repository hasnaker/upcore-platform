# UpCore Security & KVKK Hardening Checklist

> Production deploy öncesi bu checklist'teki tüm maddelerin ✅ olması gerekir.
> Son güncelleme: 2026-04-17.

---

## 🔒 Tenant İzolasyonu (Row-Level Security)

- [x] Tüm tenant-scoped tablolar `ENABLE ROW LEVEL SECURITY` (migration 014+)
- [x] Her tabloda `tenant_isolation` policy: `USING tenant_id::text = current_setting('app.tenant_id', true)`
- [x] Gateway JWT middleware `X-Tenant-Id` header'ı inject eder (`services/api-gateway/internal/middleware/tenant.go`)
- [x] Downstream servisler `SetRLSTenant` helper'ı ile her transaction başında GUC set eder (`services/*/internal/db/conn.go`)
- [ ] **Enforcement testi:** `ALTER ROLE app_user SET row_security = on` — bypass edilemez
- [ ] CI'da tenant cross-leak integration test (farklı tenant ID ile query → 0 satır)

## 🔑 PII Field-Level Encryption

- [x] `pgcrypto` extension — migration `022_pgcrypto_pii.up.sql`
- [x] `employees.tckn_enc bytea` + `employees.tckn_last_four text` (masked display için)
- [x] `app.encrypt_tckn(plain)` + `app.decrypt_tckn(enc)` UDF'leri — `app.pii_key` session var'ı zorunlu
- [ ] Production: `PII_KEY` Azure Key Vault'ta + her servis başlangıcında Redis'e cache'lenir
- [ ] Mevcut plain `tckn` sütunu dropl'anmadan önce dual-write + backfill doğrulama

## 🛡 Rate Limiting (API Gateway)

- [x] Redis tabanlı sliding-window limiter (`services/api-gateway/internal/ratelimit/`)
- [x] Path-prefix bazlı policy (public: 10/user, authenticated: 100/user, 1000/tenant)
- [ ] **Prod tuning**: attack protection thresholds
  - `/api/v1/public/surveys/*` — 10 req/min/IP
  - `/api/v1/public/candidate/*` — 5 req/min/IP
  - `/webhooks/clerk` — 60 req/min (Svix + IP whitelist)
- [ ] 429 response'a `Retry-After` header
- [ ] Azure Front Door önünde DDoS Protection Standard (WAF)

## 🔐 Auth + Session

- [x] Clerk JWT RS256, JWKS cache 1s
- [x] `X-Tenant-Id` + `X-User-Id` + `X-User-Roles` downstream header injection
- [x] Session revoke webhook (`auth/internal/clerk/webhook.go`)
- [ ] **MFA zorunlu**: `hr_director`, `chro`, `admin` rollerinde Clerk policy
- [ ] Session timeout: 8 saat aktif kullanım sonrası (Clerk Dashboard → Settings)
- [ ] Prod'da Clerk app ayrı (`clerk.upcore.app` custom domain + DNS CNAME)

## 📋 KVKK Uyum

- [x] Aydınlatma metni sayfası (`/kvkk`) — güncel versiyon
- [x] Kullanım şartları sayfası (`/kullanim-sartlari`)
- [x] Demo formunda açık rıza checkbox (zorunlu)
- [x] Anket/değerlendirme sayfalarında KVKK onay bannerı
- [x] DSR infrastructure (audit servis: `internal/service/dsr_service.go`, `kvkk_service.go`)
- [x] Retention policies DB tablosu + nightly cron (`scripts/retention-cron.sh`)
- [ ] **Veri ihracı endpoint** `/api/v1/auth/me/export` — KVKK 11. madde (auth servisine eklenecek)
- [ ] **Veri silme endpoint** `/api/v1/auth/me/delete-account` — 30 gün grace
- [ ] Üçüncü taraf veri işleyici listesi (`docs/DATA_PROCESSORS.md`): Clerk, Azure, Stripe, Iyzico

## 🚨 OWASP Top 10 Kontrolü

- [x] **A01 Broken Access Control**: RLS + role-based gateway middleware
- [x] **A02 Cryptographic Failures**: TLS 1.3 (Azure Front Door), AES-256 at-rest, pgcrypto PII
- [x] **A03 Injection**: Go tarafı pgx parameterized queries, sqlx NamedQueryContext
- [x] **A04 Insecure Design**: threat model dokümanı (architecture/UPCORE_PLATFORM_ARCHITECTURE.md)
- [x] **A05 Security Misconfiguration**: `poweredByHeader: false`, strict CSP (aşağıda)
- [ ] **A06 Vulnerable Components**: `pnpm audit` + `go list -m -u` haftalık (CI job)
- [x] **A07 Auth Failures**: Clerk MFA, brute-force protection (Clerk Attack Protection)
- [ ] **A08 Software Integrity**: Docker image signing (cosign), SBOM (syft)
- [x] **A09 Logging/Monitoring**: zerolog structured JSON + Azure Monitor + Sentry
- [ ] **A10 SSRF**: gateway upstream whitelist (`routes.yaml` target kesin, arbitrary redirect yok)

## 🌐 HTTP Security Headers

Frontend (`next.config.ts`):

- [x] `X-Frame-Options: SAMEORIGIN` (web), `DENY` (admin)
- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy: strict-origin-when-cross-origin` (web), `no-referrer` (admin)
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] Admin: `X-Robots-Tag: noindex, nofollow`
- [ ] **Content-Security-Policy** (nonce-based for inline scripts)
- [ ] **Strict-Transport-Security** (Azure Front Door `max-age=63072000; includeSubDomains; preload`)

Backend (gateway):
- [x] CORS whitelist (`CORS_ALLOWED_ORIGINS` env — prod'da `*` yasak)
- [ ] `Strict-Transport-Security` echo (gateway middleware eklenecek)

## 📦 Container / Infra

- [x] Dockerfile `USER appuser` (non-root, UID 10001)
- [x] Distroless/alpine base
- [x] Healthcheck tüm servislerde
- [ ] Pod Security Standard `restricted` (K8s)
- [ ] NetworkPolicy: her servis yalnızca kendi downstream'lerine erişim
- [ ] Azure Private Link (managed services internal-only)
- [ ] PostgreSQL `hostssl` only, TLS 1.2+

## 📝 Audit Log

- [x] `app.audit_events` tablosu (migration 019)
- [x] Audit service Service Bus consumer (`services/audit/`)
- [ ] **Immutable**: `REVOKE UPDATE, DELETE ON app.audit_events FROM app_user`
- [ ] 7-yıl cold storage (Azure Blob archive tier, retention scheduler)
- [ ] Admin paneli `/audit` canlı log viewer (şu an demo data — API endpoint eklenecek)

## 🧪 Pentest / Compliance

- [ ] 2026 Q3 external pentest (OWASP ZAP + manuel)
- [ ] ISO 27001 gap analysis (hedef sertifika 2026 Q4)
- [ ] SOC 2 Type I hazırlık (2027 Q1)
- [ ] KVKK VERBİS kaydı güncel

---

## Production Rollout Adımları

1. Migration 022 stage'de çalıştır: `DATABASE_URL=... psql -c "SET app.pii_key='$(vault kv get -field=key secret/upcore/pii)'; \\i database/migrations/022_pgcrypto_pii.up.sql"`
2. Employee service'te `tckn` yerine `tckn_enc` okuma/yazma (feature flag `dual_write_tckn`)
3. 7 gün dual-write → doğrulama → eski `tckn` column drop
4. Retention cron K8s CronJob olarak deploy (`0 3 * * *` UTC)
5. Clerk Attack Protection + MFA policy prod'a aktif
6. Azure Front Door WAF rules (OWASP Core Rule Set 3.3)
7. Security checklist CI'a gate edilir

# UpCore Security & Compliance Whitepaper

> Enterprise alıcılar + CISO için güvenlik mimarisi özeti. Kamu + Holding satışlarında eke konur. Son güncelleme: 2026-04-17.

---

## 1. Özet

UpCore, Türkiye'nin ilk bilim-temelli İK SaaS platformu. Tüm kişisel veriler Azure TR Central (İstanbul) bölgesinde işlenir ve saklanır. KVKK + ISO 27001 (hedef Q4 2026) + SOC 2 Type I (hedef Q1 2027) yol haritası ile uyum.

### Hızlı Bakış

| Kategori | Durum |
|---|---|
| Veri Bölgesi | Azure TR Central (İstanbul) — yurtdışına çıkmaz |
| Şifreleme (at-rest) | AES-256 (Azure disk + pgcrypto PII) |
| Şifreleme (transit) | TLS 1.3, HSTS 2y preload |
| Kimlik Doğrulama | Clerk RS256 JWT, MFA, SSO (SAML/OIDC) |
| Tenant İzolasyonu | Row-Level Security (RLS) + JWT tenant_id gate |
| Audit Log | Immutable, 7 yıl |
| Backup | Günlük encrypted, 30 gün retention |
| Penetration Test | Q3 2026 planlı (external firma) |
| Uyum | KVKK ✅, ISO 27001 🟡, SOC 2 🟡 |

---

## 2. Mimari Güvenlik

### 2.1 Tenant İzolasyonu (Row-Level Security)

Tüm tenant-scoped tablolar PostgreSQL Row-Level Security (RLS) politikası ile korunur:

```sql
CREATE POLICY tenant_isolation ON app.employees
    USING (tenant_id::text = current_setting('app.tenant_id', true));
```

- API Gateway JWT'den `X-Tenant-Id` inject eder
- Her servis her request başında `SET LOCAL app.tenant_id = '<uuid>'` çalıştırır
- Cross-tenant query bypass edilemez (DB-level enforcement)
- CI'da integration test: farklı tenant_id ile query → 0 satır

### 2.2 PII Field-Level Encryption

Hassas alanlar (TCKN) ayrıca uygulama katmanında şifrelenir:

```sql
SELECT pgp_sym_encrypt(tckn, current_setting('app.pii_key'));
```

- TCKN asla ham saklanmaz
- Sadece son 4 hane masked display için görünür
- Decrypt yalnızca yetkili KVKK export akışında

### 2.3 Auth + Session

- **Provider:** Clerk (SOC 2 Type II, ISO 27001 sertifikalı)
- **Token:** RS256 JWT, 1-saat lifetime
- **MFA:** `hr_director`, `chro`, `admin` rollerinde zorunlu
- **Session:** 8 saat aktif kullanım sonrası otomatik logout
- **SSO:** SAML 2.0 + OIDC (Microsoft Entra, Google Workspace, Okta)
- **Webhook:** Svix HMAC doğrulaması, revoke event'leri auth service'te işlenir

### 2.4 API Gateway

- **Rate Limit:** Redis sliding window — path-prefix bazlı policy
- **CORS:** Whitelist (prod'da `*` yasak)
- **Security Headers:** HSTS, X-Frame-Options DENY, CSP, Permissions-Policy
- **Circuit Breaker:** Upstream başarısızlığında otomatik fallback
- **Correlation ID:** Her request için trace — X-Request-Id header

### 2.5 Network

- **Ingress:** Azure Front Door WAF (OWASP Core Rule Set 3.3)
- **DDoS:** Azure DDoS Protection Standard
- **Private Link:** PostgreSQL, Redis, Service Bus internal-only
- **Pod-to-pod:** Kubernetes NetworkPolicy `deny-all` default
- **TLS:** Tüm hostsl, min TLS 1.2, ECDHE cipher suite

---

## 3. Veri Yaşam Döngüsü

### 3.1 Kişisel Veri Kategorileri

| Kategori | Veri Tipi | Saklama Süresi | Şifreleme |
|---|---|---|---|
| Kimlik | Ad, soyad, doğum tarihi | İş ilişkisi + 10 yıl | At-rest |
| İletişim | E-posta, telefon, adres | İş ilişkisi + 10 yıl | At-rest |
| TCKN | 11-hane | İş ilişkisi + 10 yıl | **Field-level AES** |
| Değerlendirme | BAT skorları, JD-R | Anonim agregat süresiz | At-rest |
| Belge | Sözleşme, sağlık | İş ilişkisi + 10 yıl | At-rest (Azure Blob) |
| Aday | ATS başvuru | 6 ay (KVKK açık rıza) | At-rest |
| Audit Log | Erişim kayıtları | 7 yıl immutable | At-rest + cold storage |

### 3.2 Retention Scheduler

Nightly cron (`scripts/retention-cron.sh`) otomatik silme:

```
ats_candidate_6mo      → 180d sonra rejected/withdrawn aday hard delete
audit_events_7y        → 7 yıl sonra Azure Blob cold storage
tenant_deleted_90d     → Tenant termination 90 gün read-only sonra hard delete
survey_response_anon   → 2 yıl sonra agregat anonymize
```

### 3.3 Sözleşme Sonu Veri Teslimi

1. Sözleşme fesih tarihi + **90 gün read-only** erişim
2. Müşteri veri ihraç talebi → CSV/JSON full dump (encrypted 7z)
3. 90 gün sonra **hard delete** + Azure audit log + **ispat belgesi**
4. KVKK 11. madde hakları 30 gün içinde yanıtlanır

---

## 4. Üçüncü Taraf Veri İşleyiciler

| Sağlayıcı | Amaç | Konum | Uyum |
|---|---|---|---|
| Microsoft Azure | Compute + Storage + DB | TR Central | ISO 27001, SOC 2, KVKK |
| Clerk Inc. | Kimlik doğrulama | ABD | SOC 2 Type II — SCC |
| Iyzico | Ödeme (TR müşteriler) | Türkiye | PCI-DSS Level 1 |
| Stripe | Ödeme (international) | ABD + EU | PCI-DSS Level 1, SCC |
| Azure OpenAI | LLM (rationale generation) | TR Central | KVKK uyumlu |
| Sentry | Error tracking | ABD | SOC 2, GDPR — data scrubbing aktif |

Tam liste + DPA dokümanları: [docs/DATA_PROCESSORS.md](DATA_PROCESSORS.md)

---

## 5. Incident Response

### 5.1 Severity Matrisi

| Seviye | Tanım | Response Time | Müşteri Bildirim |
|---|---|---|---|
| P0 — Kritik | Veri sızıntısı, servis tamamen down | 15 dk | 1 saat |
| P1 — Yüksek | Tek tenant kritik bug | 1 saat | 4 saat |
| P2 — Orta | Kısmi özellik bozuk | 4 saat | Sonraki iş günü |
| P3 — Düşük | Minor UI issue | 1 iş günü | — |

### 5.2 Breach Notification

- **KVKK:** 72 saat içinde Kişisel Verileri Koruma Kurumu bildirimi
- **Müşteri:** Etkilenen tenant'lar 24 saat içinde e-posta + dashboard banner
- **Veri sahipleri:** Etkilenen bireyler 30 gün içinde doğrudan bilgilendirme
- **Kamuoyu:** Major breach durumu basın açıklaması (PR protokolü)

---

## 6. Compliance Roadmap

### 2026
- ✅ KVKK VERBİS kaydı (2026 Q1)
- 🟡 External pentest — OWASP ZAP + manuel (Q3)
- 🟡 ISO 27001 sertifika (Q4)
- 🟡 TSE K-KVKK uygunluk belgesi (Q4)

### 2027
- 🟡 SOC 2 Type I (Q1)
- 🟡 ISO 27701 PII extension (Q2)
- 🟡 SOC 2 Type II (Q4)

### 2028
- 🟡 FedRAMP Moderate — Türkiye kamu sektörü için

---

## 7. Security Operations

### 7.1 Logging & Monitoring
- **Structured logs:** zerolog JSON (Go), structlog (Python)
- **Aggregation:** Azure Monitor + Application Insights
- **Alerting:** Sentry (error tracking) + PagerDuty (P0/P1)
- **SIEM:** Azure Sentinel (2026 Q4 planlı)

### 7.2 Vulnerability Management
- **Haftalık:** `pnpm audit` + `go list -m -u` + `pip-audit` CI gate
- **Aylık:** Dependency version review, CVE scan
- **Quarterly:** Infrastructure as Code (Bicep) review
- **Annual:** External pentest + red team exercise

### 7.3 Backup & Disaster Recovery
- **Backup:** PostgreSQL continuous backup (Azure)
- **Retention:** 30 gün point-in-time, 90 gün full dump cold storage
- **RPO:** 5 dakika (continuous replication)
- **RTO:** 4 saat (region failover drill)
- **DR Drill:** 6 ayda 1 test

---

## 8. Müşteri Taahhütleri

UpCore aşağıdakileri taahhüt eder:

1. **Uptime SLA:** %99.5 aylık (sözleşmede %99.9 seçeneği)
2. **Bildirim:** Planlı bakım 7 gün önceden duyurulur
3. **Destek:** Business hours + P0/P1 için 7/24 (Enterprise)
4. **Veri Sahipliği:** Tüm veriler müşterinindir, UpCore işleyicidir
5. **Veri İhracı:** Her zaman, ücretsiz, 14 iş günü içinde
6. **Şeffaflık:** Status sayfası (status.upcore.app) gerçek zamanlı

---

## 9. İletişim

- **Güvenlik ekibi:** security@upcore.app
- **KVKK / Veri sahibi hakları:** kvkk@upcore.app
- **Acil durum (P0):** +90 212 333 44 55 (7/24)
- **Public PGP key:** https://upcore.app/.well-known/pgp-key.asc

---

*Bu whitepaper periyodik olarak güncellenir. Son sürüm: upcore.app/security-whitepaper*

# SOC 2 Type I Gap Analysis — UpCore

> 2026-04-17 itibarıyla SOC 2 Trust Service Criteria karşısında durum. Hedef: Q1 2027 Type I sertifikası.

---

## Trust Service Criteria

### CC1 — Control Environment

| Control | Durum | Notlar |
|---|---|---|
| CC1.1 Integrity and ethics | 🟡 | Employee handbook drafting |
| CC1.2 Board oversight | 🟢 | Kurucu + advisor yapısı var |
| CC1.3 Organization structure | 🟢 | Org chart documented |
| CC1.4 HR policies | 🟡 | Background check prosedürü eksik |
| CC1.5 Accountability | 🟢 | RACI matrix mevcut |

### CC2 — Communication and Information

| Control | Durum | Notlar |
|---|---|---|
| CC2.1 Internal communications | 🟢 | Slack + quarterly all-hands |
| CC2.2 External communications | 🟢 | status.upcore.app + release notes |
| CC2.3 Board reporting | 🟡 | Monthly metrics report template gerekli |

### CC3 — Risk Assessment

| Control | Durum | Notlar |
|---|---|---|
| CC3.1 Risk identification | 🟡 | Threat model Q3 2026 güncellenecek |
| CC3.2 Risk analysis | 🟡 | OWASP risk matrix draft |
| CC3.3 Fraud risk | 🟡 | Missing (Type I öncesi tamamlanmalı) |
| CC3.4 Change management | 🟢 | GitHub + CI/CD + review requirement |

### CC4 — Monitoring Activities

| Control | Durum | Notlar |
|---|---|---|
| CC4.1 Ongoing monitoring | 🟢 | Azure Monitor + Sentry |
| CC4.2 Deficiency communication | 🟡 | Incident postmortem şablonu var, retrospective süreç eksik |

### CC5 — Control Activities

| Control | Durum | Notlar |
|---|---|---|
| CC5.1 Control selection | 🟢 | OWASP + CIS benchmark referans |
| CC5.2 Control implementation | 🟢 | IaC (Bicep) + K8s policies |
| CC5.3 Policy deployment | 🟡 | Security policy documented, training eksik |

### CC6 — Logical and Physical Access

| Control | Durum | Notlar |
|---|---|---|
| CC6.1 Identity management | 🟢 | Clerk SSO + SAML/OIDC |
| CC6.2 Access provisioning | 🟢 | RBAC tenant + role matrix |
| CC6.3 Access modification | 🟢 | Clerk webhook → audit log |
| CC6.4 Access removal | 🟢 | Automated on role change |
| CC6.5 Physical access | 🟢 | Azure data center (Microsoft responsibility) |
| CC6.6 Boundaries | 🟢 | Tenant RLS + VPN for admin |
| CC6.7 Restricted access | 🟡 | Privileged access MFA zorunlu yapılacak |
| CC6.8 Prevent unauthorized | 🟢 | WAF + DDoS + rate limit |

### CC7 — System Operations

| Control | Durum | Notlar |
|---|---|---|
| CC7.1 Detection of events | 🟢 | Sentry alerting |
| CC7.2 Monitor security events | 🟡 | SIEM (Azure Sentinel) 2026 Q4 planlı |
| CC7.3 Evaluate security events | 🟡 | Incident response playbook final'a gelecek |
| CC7.4 Respond to incidents | 🟡 | IR drill yapılmalı |
| CC7.5 Recover from incidents | 🟡 | DR drill 6 ayda 1 planlı |

### CC8 — Change Management

| Control | Durum | Notlar |
|---|---|---|
| CC8.1 Changes | 🟢 | PR review + CI/CD gate |

### CC9 — Risk Mitigation

| Control | Durum | Notlar |
|---|---|---|
| CC9.1 Vendor management | 🟡 | DPA templateı hazır, quarterly review süreç eksik |
| CC9.2 Vendor monitoring | 🔴 | Missing — Q2 2026 odak |

---

## Availability Category

| Control | Durum | Notlar |
|---|---|---|
| A1.1 Availability commitments | 🟢 | %99.5 SLA contract standard |
| A1.2 Environmental protections | 🟢 | Azure managed |
| A1.3 Backup / recovery | 🟢 | RPO 5 dk, RTO 4 saat |

## Confidentiality Category

| Control | Durum | Notlar |
|---|---|---|
| C1.1 Identify confidential info | 🟢 | PII tagged |
| C1.2 Protect confidential info | 🟢 | TLS 1.3 + AES-256 + pgcrypto |

## Processing Integrity Category

| Control | Durum | Notlar |
|---|---|---|
| PI1.1 Define processing | 🟢 | OpenAPI specs |
| PI1.2-5 Processing controls | 🟡 | E2E test coverage %60, hedef %85 |

## Privacy Category (KVKK için zaten yüksek)

| Control | Durum | Notlar |
|---|---|---|
| P1.1 Privacy notice | 🟢 | /kvkk page + consent flows |
| P2.1 Consent | 🟢 | Açık rıza akışı + audit log |
| P3.1 Use retention | 🟢 | Retention policies scheduler |
| P4.1 Access | 🟢 | KVKK 11. madde endpoint planlandı |
| P5.1 Disclosure | 🟢 | DPA + vendor list |
| P6.1 Quality | 🟡 | Data validation Zod + pgx ama procedural check eksik |
| P7.1 Monitoring | 🟡 | Privacy officer atama sürüyor |

---

## Gap Özeti

| Seviye | Count | Örnek |
|---|---|---|
| 🟢 Complete | 29 | RLS, Clerk, HSTS, IaC |
| 🟡 In Progress | 17 | IR drill, SIEM, vendor review |
| 🔴 Missing | 1 | Vendor monitoring (Q2 2026) |

**Tahmini effort:** 🟡 → 🟢 için ~250 engineering hours + external audit cost ₺350K.

---

## Audit Partner Planlaması

Önerilen firmalar (Türkiye + SOC 2 deneyimli):
1. **Deloitte TR** — büyük enterprise, yüksek fee
2. **KPMG TR** — orta-büyük, standart SOC 2 audit
3. **A-LIGN** — fintech odaklı, ABD-based (TR ofisi yok ama remote audit mümkün)

**Hedef timeline:**
- 2026 Q2: Gap remediation başla
- 2026 Q4: Mock audit (internal dry-run)
- 2027 Q1: Official SOC 2 Type I audit (6-ay gözlem dönemi)
- 2027 Q2: Type I sertifika alımı
- 2027 Q3: Type II audit başla (12-ay gözlem dönemi)
- 2027 Q4: Type II sertifika

---

## Öncelikli Gap'ler (Q2-Q3 2026)

### 1. Vendor Monitoring (CC9.2) — 🔴
- **Ne:** Tüm üçüncü taraf vendor'ların quarterly SOC 2 / ISO 27001 sertifika renewal tracking
- **Sorumlu:** Security Lead
- **Deadline:** Q2 2026

### 2. SIEM Deployment (CC7.2) — 🟡
- **Ne:** Azure Sentinel workspace + Azure AD + Clerk + app log integration
- **Sorumlu:** DevOps Lead
- **Deadline:** Q4 2026

### 3. Incident Response Drill (CC7.3-7.5) — 🟡
- **Ne:** Tabletop exercise (veri sızıntısı senaryosu) + full IR drill
- **Sorumlu:** Security + Engineering
- **Deadline:** Q3 2026

### 4. Privacy Officer Ataması (P7.1) — 🟡
- **Ne:** KVKK VERBİS kayıtlı Veri Sorumlusu Temsilcisi
- **Sorumlu:** CEO + Legal
- **Deadline:** Q2 2026 (yasal zorunluluk)

### 5. Fraud Risk Assessment (CC3.3) — 🟡
- **Ne:** Financial fraud + insider threat model + mitigation controls
- **Sorumlu:** Security Lead
- **Deadline:** Q3 2026

---

*Bu gap analysis her çeyrek güncellenir. Sorumlu: security@upcore.app*

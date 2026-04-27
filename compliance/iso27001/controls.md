# ISO/IEC 27001:2022 Annex A — Kontrol Matrisi

**Organizasyon:** UpCore A.Ş.
**Kapsam (SoA):** upcore.app SaaS platformu — tüm production Azure kaynakları (TR Central),
tüm müşteri verisi, geliştirme ortamı, ofis BT varlıkları.
**Son güncelleme:** 2026-04-22
**Sorumlu:** CISO (v.k.:  hasan.aker@upcore.app)
**Durum anahtarı:**
`✅ uygulanıyor` · `🟡 kısmen` · `⛔ eksik` · `N/A kapsam dışı`

ISO 27001:2022, 93 kontrol içerir (A.5 Organizational, A.6 People, A.7 Physical, A.8 Technological).
Her satırda: kontrol, durum, **kanıt yeri** (repo path / URL), sahip, boşluk.

---

## A.5 — Organizational (37 kontrol)

| # | Kontrol | Durum | Kanıt | Sahip | Boşluk |
|---|---|---|---|---|---|
| A.5.1 | Policies for information security | ✅ | `compliance/policies/information-security-policy.md` | CISO | — |
| A.5.2 | Information security roles | ✅ | RACI — `compliance/policies/raci.md` | CISO | — |
| A.5.3 | Segregation of duties | ✅ | IAM — prod push = 2 kişi, dev/prod ayrı Azure sub | CISO | Denetim örneklemi eksik |
| A.5.4 | Management responsibilities | 🟡 | Board quarterly review calendar | CEO | Formal tutanak yok |
| A.5.5 | Contact with authorities | ⛔ | — | DPO | KVKK, BTK, USOM kontakları resmen sözleşmelendirilmedi |
| A.5.6 | Contact with special interest groups | 🟡 | OWASP Istanbul chapter üyelik | CISO | Üyelik belgesi eksik |
| A.5.7 | Threat intelligence | 🟡 | `compliance/iso27001/threat-model.md` (STRIDE) | CISO | TI feed entegrasyonu yok |
| A.5.8 | Information security in project management | ✅ | PR template security checkbox + BMAD /arch | Eng Lead | — |
| A.5.9 | Inventory of information + other associated assets | 🟡 | `compliance/iso27001/asset-inventory.yaml` | IT Lead | Mobile cihaz envanteri kısmi |
| A.5.10 | Acceptable use of information + other associated assets | ✅ | `compliance/policies/acceptable-use.md` | HR | — |
| A.5.11 | Return of assets | ✅ | Offboarding checklist (services/employee/internal/service/offboarding.go) | HR | — |
| A.5.12 | Classification of information | ✅ | `compliance/policies/data-classification.md` (Public/Internal/Confidential/KVKK-özel) | DPO | — |
| A.5.13 | Labelling of information | 🟡 | DB column `pii_level` migration 024 | DPO | File-level tagging yok |
| A.5.14 | Information transfer | ✅ | SFTP + SAS URL + 7 gün TTL (migration 046) | Eng | — |
| A.5.15 | Access control | ✅ | Clerk + RBAC (auth/internal/rbac) + RLS (DB) | Eng | — |
| A.5.16 | Identity management | ✅ | Clerk + SAML SSO (migration 048) | Eng | — |
| A.5.17 | Authentication information | ✅ | Bcrypt hash, no password recovery mail in logs | Eng | — |
| A.5.18 | Access rights | ✅ | Annual re-certification cron — `scripts/access-review.sh` | CISO | — |
| A.5.19 | Information security in supplier relationships | 🟡 | Subprocessor listesi `compliance/subprocessors.md` | DPO | DPA imzaları %80 (eksik: Proxycurl, Clerk) |
| A.5.20 | Addressing information security within supplier agreements | 🟡 | DPA template | Legal | İç template henüz resmileşmedi |
| A.5.21 | Managing information security in the ICT supply chain | 🟡 | Dependabot + renovate | Eng | SBOM üretilmiyor |
| A.5.22 | Monitoring, review and change management of supplier services | ⛔ | — | DPO | Quarterly review yok |
| A.5.23 | Information security for use of cloud services | ✅ | Azure subscription MFA, named users, tagged | IT Lead | — |
| A.5.24 | Information security incident management planning | ✅ | `compliance/policies/incident-response.md` | CISO | — |
| A.5.25 | Assessment and decision on information security events | ✅ | Severity matrix in IR playbook | CISO | — |
| A.5.26 | Response to information security incidents | ✅ | On-call rotation (Grafana + PagerDuty equiv) | SRE | — |
| A.5.27 | Learning from information security incidents | 🟡 | Post-mortem template | CISO | Sadece 1 tatbikat yapıldı |
| A.5.28 | Collection of evidence | ✅ | `app.audit_events` immutable 7yr | DPO | — |
| A.5.29 | Information security during disruption | ✅ | BCP plan `ops/BACKUP_RESTORE.md` | SRE | — |
| A.5.30 | ICT readiness for business continuity | ✅ | RTO 4h, RPO 15min, quarterly DR drill (scripts/dr-drill.sh) | SRE | — |
| A.5.31 | Legal, statutory, regulatory and contractual requirements | ✅ | KVKK + İş Kanunu + SGK ayrı register | DPO | — |
| A.5.32 | Intellectual property rights | ✅ | Licence policy, dependency check | Legal | — |
| A.5.33 | Protection of records | ✅ | Audit log WORM, financial records 10yr | DPO | — |
| A.5.34 | Privacy and protection of PII | ✅ | KVKK uyum + pseudonymisation (pgcrypto tckn) | DPO | — |
| A.5.35 | Independent review of information security | ⛔ | — | CISO | Yıllık dış denetim planlandı (2026 Q4 pentest) |
| A.5.36 | Compliance with policies, rules and standards | 🟡 | Quarterly internal audit plan | CISO | İlk iç denetim henüz yapılmadı |
| A.5.37 | Documented operating procedures | 🟡 | `ops/`, `docs/` klasörleri | SRE | Runbook kapsaması %70 |

## A.6 — People (8 kontrol)

| # | Kontrol | Durum | Kanıt | Sahip | Boşluk |
|---|---|---|---|---|---|
| A.6.1 | Screening | ✅ | İşe alım adli sicil kontrolü (hr_admin onay) | HR | — |
| A.6.2 | Terms and conditions of employment | ✅ | NDA + bilgi güvenliği ek madde | HR | — |
| A.6.3 | Information security awareness, education and training | 🟡 | Yıllık online eğitim + quiz (yeni) | HR | Tamamlama oranı takipsiz |
| A.6.4 | Disciplinary process | ✅ | Policy + offboarding SOP | HR | — |
| A.6.5 | Responsibilities after termination or change of employment | ✅ | Clerk user disabled + badge return | HR | — |
| A.6.6 | Confidentiality or non-disclosure agreements | ✅ | NDA imzalı tüm personel + müşteri | Legal | — |
| A.6.7 | Remote working | ✅ | Remote policy + MDM (MacOS JamF) | IT | — |
| A.6.8 | Information security event reporting | ✅ | #security Slack + security@upcore.app | CISO | — |

## A.7 — Physical (14 kontrol)

| # | Kontrol | Durum | Kanıt | Sahip | Boşluk |
|---|---|---|---|---|---|
| A.7.1 | Physical security perimeters | ✅ | Ofis binası kartlı giriş + kamera | IT | — |
| A.7.2 | Physical entry | ✅ | Ziyaretçi defteri + NDA | IT | — |
| A.7.3 | Securing offices, rooms and facilities | ✅ | Server kabinine ayrı kart | IT | — |
| A.7.4 | Physical security monitoring | ✅ | 24/7 kamera, 30 gün retention | IT | — |
| A.7.5 | Protection against physical and environmental threats | ✅ | UPS, yangın tüpü, deprem kayışı | IT | — |
| A.7.6 | Working in secure areas | 🟡 | Sunucu odasına sadece yetkili | IT | Yazılı prosedür eksik |
| A.7.7 | Clear desk and clear screen | ✅ | Screen lock 5 dk, MDM enforced | IT | — |
| A.7.8 | Equipment siting and protection | ✅ | Cihaz konumu risk dokümanı | IT | — |
| A.7.9 | Security of assets off-premises | ✅ | MDM + disk encryption + remote wipe | IT | — |
| A.7.10 | Storage media | ✅ | USB kontrollü, şifreli | IT | — |
| A.7.11 | Supporting utilities | ✅ | UPS + jenerator | IT | — |
| A.7.12 | Cabling security | ✅ | Kablo kanalı, etiketli | IT | — |
| A.7.13 | Equipment maintenance | ✅ | 2yıl/1 server servis sözleşmesi | IT | — |
| A.7.14 | Secure disposal or re-use of equipment | ✅ | DBAN + sertifikalı imha firması | IT | — |

## A.8 — Technological (34 kontrol) — **En yüksek önem**

| # | Kontrol | Durum | Kanıt | Sahip | Boşluk |
|---|---|---|---|---|---|
| A.8.1 | User endpoint devices | ✅ | JamF MDM, disk encryption, AV | IT | — |
| A.8.2 | Privileged access rights | ✅ | Prod kubectl: sadece 3 kişi, audited | SRE | — |
| A.8.3 | Information access restriction | ✅ | RLS (PostgreSQL set_config tenant) + RBAC | Eng | — |
| A.8.4 | Access to source code | ✅ | GitHub branch protection, 2 approver main | Eng | — |
| A.8.5 | Secure authentication | ✅ | Clerk + MFA zorunlu admin | Eng | — |
| A.8.6 | Capacity management | ✅ | Grafana auto-scale alarm | SRE | — |
| A.8.7 | Protection against malware | ✅ | ClamAV document upload (services/document) + M365 AV | Eng | — |
| A.8.8 | Management of technical vulnerabilities | ✅ | Dependabot + Snyk weekly scan | Eng | — |
| A.8.9 | Configuration management | ✅ | Terraform IaC + Ansible + drift check | SRE | — |
| A.8.10 | Information deletion | ✅ | KVKK export + hard delete (migration 046) | DPO | — |
| A.8.11 | Data masking | 🟡 | TCKN pgcrypto, PII logging filter | Eng | Test env mask full değil |
| A.8.12 | Data leakage prevention | 🟡 | Egress deny ACL + ClamAV | SRE | DLP tool yok |
| A.8.13 | Information backup | ✅ | PITR 35d + weekly pg_dump + geo-replica | SRE | — |
| A.8.14 | Redundancy of information processing facilities | ✅ | Azure AZ redundancy + NE warm-standby | SRE | — |
| A.8.15 | Logging | ✅ | zerolog structured JSON → Azure Monitor | SRE | — |
| A.8.16 | Monitoring activities | ✅ | Grafana SLO dashboard, PagerDuty | SRE | — |
| A.8.17 | Clock synchronisation | ✅ | chrony on all hosts | SRE | — |
| A.8.18 | Use of privileged utility programs | ✅ | Sudo session recording (ttyrec) | SRE | — |
| A.8.19 | Installation of software on operational systems | ✅ | No direct package install, only helm/terraform | SRE | — |
| A.8.20 | Networks security | ✅ | VNet + NSG + private endpoint | SRE | — |
| A.8.21 | Security of network services | ✅ | TLS 1.3 only, HSTS, cert auto-renew | SRE | — |
| A.8.22 | Segregation of networks | ✅ | Prod/staging/dev ayrı VNet | SRE | — |
| A.8.23 | Web filtering | ✅ | Egress NSG, gateway ALLOWLIST | SRE | — |
| A.8.24 | Use of cryptography | ✅ | AES-256 at rest, TLS 1.3, HMAC-SHA256 webhook, bcrypt auth | Eng | — |
| A.8.25 | Secure development life cycle | ✅ | PR review + CI security gates + BMAD | Eng | — |
| A.8.26 | Application security requirements | ✅ | OWASP ASVS L2 target, checklist `compliance/pentest/SCOPE.md` | Eng | — |
| A.8.27 | Secure system architecture + engineering principles | ✅ | `architecture/` — threat model per service | Eng | — |
| A.8.28 | Secure coding | ✅ | CodeQL + gosec + ESLint security plugin | Eng | — |
| A.8.29 | Security testing in development + acceptance | 🟡 | Unit + integration + k6 load; pentest eksik | Eng | Pentest 2026 Q4 |
| A.8.30 | Outsourced development | N/A | — | — | Iç geliştirme |
| A.8.31 | Separation of development, test and production environments | ✅ | 3 Azure subscription, separate Clerk projeleri | SRE | — |
| A.8.32 | Change management | ✅ | GitHub PR gating + Slack #deploys announcement | Eng | — |
| A.8.33 | Test information | ✅ | Synthetic test data only, prod kopyalamaz | Eng | — |
| A.8.34 | Protection of information systems during audit testing | ✅ | Read-only audit IAM role | SRE | — |

---

## Özet — Kapanış için kalan 10 iş

1. A.5.5 — Resmi makamlar kontakları sözleşmeli hale getir (BTK/USOM/KVKK Kurumu).
2. A.5.22 — Subprocessor quarterly review prosedürü yaz + ilk toplantıyı yap.
3. A.5.35 — Yıllık dış güvenlik denetçisi sözleşmesi imzala (Q4 pentest ile birleştirilebilir).
4. A.5.36 — İlk iç denetim turunu planla ve raporla (ISO 27001 stage 1 öncesi).
5. A.5.21 — SBOM üretimi: `syft` Docker image + CI entegrasyonu.
6. A.6.3 — Farkındalık eğitimi tamamlama oranı dashboard (HR → LMS).
7. A.8.11 — Test env'de PII gerçek maskeleme (not just NULL).
8. A.8.12 — DLP tool seçimi (Azure Purview veya açık kaynak).
9. A.7.6 — Sunucu odası prosedürü yaz.
10. A.5.27 — Quarterly tabletop exercise (incident simulation).

**Hedef ISO 27001 Stage 1 denetim:** 2026-10-01
**Hedef Stage 2 sertifika:** 2027-01-15

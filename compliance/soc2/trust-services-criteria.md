# SOC 2 — Trust Services Criteria (TSP 2017, 2022 points of focus)

**Organizasyon:** UpCore A.Ş.
**Hedef:** SOC 2 Type II raporu (12 aylık gözlem penceresi)
**Kapsam kategorileri:** Security · Availability · Confidentiality · Processing Integrity · Privacy
**Hedef denetim firması:** TBD (Mazars TR / PwC TR ile görüşmeler 2026 Q3)
**Gözlem başlangıcı:** 2026-07-01 (12 ay → rapor 2027-07-01)
**Son güncelleme:** 2026-04-22

---

## Kategori Seçimi ve Gerekçe

| TSC | Dahil? | Gerekçe |
|---|---|---|
| **Security (CC)** | ✅ Zorunlu | SOC 2 common criteria; tüm raporlarda bulunur |
| **Availability (A)** | ✅ | Müşteri SLA 99.9% — uptime taahhüdümüz var |
| **Confidentiality (C)** | ✅ | Tenant verisi, KVKK uyum kritik farklılaşma |
| **Processing Integrity (PI)** | 🟡 Değerlendiriliyor | Bordro + ücret hesaplama için talep olabilir; Q3'te karar |
| **Privacy (P)** | ⛔ İlk raporda yok | KVKK zaten ayrı audit; SOC 2 Privacy TSC Q2 2027'de ekle |

---

## Common Criteria (CC) — Security

### CC1 — Control Environment

| Kriter | Kontrol | Durum | Kanıt |
|---|---|---|---|
| CC1.1 | Ethical tone from top | ✅ | Code of conduct — `compliance/policies/code-of-conduct.md`; board imza |
| CC1.2 | Board oversight | 🟡 | Quarterly security review — ilk toplantı 2026-05; minutes eksik |
| CC1.3 | Organizational structure | ✅ | Org chart + RACI `compliance/policies/raci.md` |
| CC1.4 | Commitment to competence | ✅ | Yıllık performance review + training tracker |
| CC1.5 | Accountability | ✅ | Job descriptions + KPI in HR records |

### CC2 — Communication & Information

| CC2.1 | Information quality | ✅ | Grafana dashboard + monthly security report |
| CC2.2 | Internal communication | ✅ | #security Slack + quarterly all-hands |
| CC2.3 | External communication | ✅ | Trust center `/guven` + security.txt + SLA docs |

### CC3 — Risk Assessment

| CC3.1 | Objectives with risks | ✅ | Risk register `compliance/iso27001/risk-register.md` |
| CC3.2 | Risk identification | ✅ | STRIDE threat model per service |
| CC3.3 | Fraud risk | ✅ | Saga compensation + audit log |
| CC3.4 | Changes affecting controls | ✅ | Change advisory via PR review |

### CC4 — Monitoring Activities

| CC4.1 | Ongoing monitoring | ✅ | Grafana + Azure Monitor + PagerDuty |
| CC4.2 | Deficiency evaluation | 🟡 | Incident retro prosedürü var; evaluation rigor düşük |

### CC5 — Control Activities

| CC5.1 | Control selection | ✅ | ISO 27001 Annex A eşlemesi — `compliance/iso27001/controls.md` |
| CC5.2 | Technology controls | ✅ | IaC + GitOps + automated tests |
| CC5.3 | Documented policies | ✅ | `compliance/policies/` dizini |

### CC6 — Logical & Physical Access Controls

| CC6.1 | Access control enforcement | ✅ | Clerk + RBAC + RLS (services/auth, DB set_config) |
| CC6.2 | New user provisioning | ✅ | Clerk SCIM + approval workflow |
| CC6.3 | User deprovisioning | ✅ | Offboarding saga (services/employee/internal/service/offboarding.go) |
| CC6.4 | Physical access | ✅ | Azure DC — Microsoft attestation (ISO 27001/27017/27018) |
| CC6.5 | Mobile device management | ✅ | JamF MDM, disk encryption required |
| CC6.6 | Logical access segregation | ✅ | Prod/stage/dev ayrı Azure sub |
| CC6.7 | Data transmission encryption | ✅ | TLS 1.3 minimum, HSTS max-age 31536000 |
| CC6.8 | Prevention of unauthorized software | ✅ | No direct kubectl apply, only CI/CD deployments |

### CC7 — System Operations

| CC7.1 | Detection of security events | ✅ | audit_events + Azure Sentinel rules |
| CC7.2 | Monitoring for anomalies | 🟡 | Grafana threshold alerts; ML-based anomaly eksik |
| CC7.3 | Incident response | ✅ | IR playbook + on-call rotation |
| CC7.4 | Incident communication | ✅ | status.upcore.app + customer email |
| CC7.5 | Recovery from incidents | ✅ | Quarterly DR drill + post-mortem |

### CC8 — Change Management

| CC8.1 | Change authorization | ✅ | GitHub 2-reviewer branch protection |
| CC8.2 | System change testing | ✅ | CI pipeline + staging deployment |
| CC8.3 | Emergency changes | ✅ | Break-glass prosedür + post-hoc approval |

### CC9 — Risk Mitigation

| CC9.1 | Vendor risk assessment | 🟡 | Subprocessor register — DPA imza %80 |
| CC9.2 | Business continuity | ✅ | BCP `ops/BACKUP_RESTORE.md` + DR drill |

---

## Availability Category (A)

| A1.1 | Capacity planning | ✅ | Azure auto-scale + quarterly capacity review |
| A1.2 | System backup | ✅ | PITR 35d + weekly pg_dump → geo-replicated blob |
| A1.3 | Recovery | ✅ | RTO 4h, RPO 15 min, quarterly DR drill |

**SLA müşteri taahhüdü:** 99.9% aylık uptime (43 dakika max downtime), güvenlik yamaları hariç.

---

## Confidentiality Category (C)

| C1.1 | Identification of confidential information | ✅ | Data classification (public/internal/confidential/KVKK-özel) |
| C1.2 | Disposal of confidential information | ✅ | KVKK hard delete + blob versioning removal |

**Kritik kontrol:** Tenant izolasyon — PostgreSQL RLS her sorguda `set_config('app.tenant_id', ...)`
ile uygulanır. Guard: `pkg/db.SetRLSTenant` çağrısı tüm repo'larda zorunlu, linter kuralı ile
enforce edilir.

---

## Processing Integrity (PI) — Opsiyonel, Q3 karar

Eğer dahil edilirse:

| PI1.1 | Processing accuracy | ✅ | Bordro golden test + reconciliation |
| PI1.2 | Processing timeliness | ✅ | Outbox pattern + idempotency key |
| PI1.3 | Processing completeness | ✅ | Saga + eventual consistency tests |
| PI1.4 | Error handling | ✅ | Audit log + DLQ |
| PI1.5 | Data validity | ✅ | Domain validators + CHECK constraints |

---

## Pre-audit Hazırlık Checklist

- [ ] 12 aylık gözlem penceresi için **veri toplama altyapısı** (2026-07-01 itibariyle tüm
      kontrollerin tamamen otomatik delil üretmesi gerekiyor; manuel kanıt kabul edilmez).
- [ ] **Vanta / Drata / Secureframe** compliance automation platformu seç (Q2'de PoC).
- [ ] **Readiness assessment** bağımsız bir CPA firması ile 2026-06'da yap.
- [ ] **Policy suite** son hâli (tüm `compliance/policies/` imzalı, her çalışan onayı LMS'te).
- [ ] **HR kayıtları** (screening + training completion + NDA) audit-ready.
- [ ] **Access reviews** — quarterly, dokümante, imzalı.
- [ ] **Incident log** — son 12 ayda incident olsun ya da olmasın, "no incident" kaydı da gerekli.
- [ ] **Vendor due diligence** — her subprocessor için DPA + SOC 2 rapor (vendor'dan) dosyalı.
- [ ] **Penetration test** — yıllık, bağımsız firma, remediation kanıtları.
- [ ] **Backup restore test** — quarterly, başarı raporu.

## Maliyet Tahmini (2026)

- Compliance automation SaaS: **~15k USD/yıl**
- Readiness + Type I audit: **~25k USD**
- Type II audit (12 ay sonunda): **~40k USD**
- Penetration test: **~20k USD**
- **Toplam ilk yıl:** ~100k USD

---

**Paralel ISO 27001 notu:** Kontrollerin %85'i örtüşüyor, tek seferde iki sertifika alınabilir
(ISO önde, SOC 2 arkasından). Bu matris `compliance/iso27001/controls.md` ile çift yönlü eşlenir.

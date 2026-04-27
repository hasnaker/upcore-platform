# UpCore — Subprocessor Registry

**Son güncelleme:** 2026-04-22
**Sahip:** DPO (hasan.aker@upcore.app)
**Bildirim yolu:** yeni/değişen subprocessor → tenant admin'lere 10 iş günü
önceden e-posta; itiraz hakkı SaaS sözleşmesi m.6.

Kamusal JSON endpoint: `/api/compliance/subprocessors.json`
Trust center sayfası: `/guven`

## Tier 1 — Müşteri verisine doğrudan erişir

| Vendor | Amaç | Lokasyon | Veri Kategorisi | DPA | Sertifika |
|---|---|---|---|---|---|
| Microsoft Azure | Hosting, DB, Storage, Service Bus, Key Vault | TR Central + EU North (warm-standby) | Tüm müşteri verisi (at rest) | ✅ | ISO 27001, 27017, 27018, SOC 2 Type II, PCI-DSS |
| Clerk | Kimlik yönetimi (authn/authz, MFA, SSO) | ABD | Kullanıcı email, ad, rol | ✅ | SOC 2 Type II |
| Iyzico (BKM) | Ödeme (TR kartları) | Türkiye | Card token, işlem meta | ✅ | PCI-DSS Level 1 |
| Stripe | Ödeme (global kart) | İrlanda / ABD | Card token, işlem meta | ✅ | PCI-DSS Level 1, SOC 2 |
| DocuSign | E-imza (teklif, sözleşme) | ABD | PDF, imzalayıcı email | ✅ | SOC 2 Type II, ISO 27001 |

## Tier 2 — Yardımcı, anonymised temas

| Vendor | Amaç | Lokasyon | Veri Kategorisi | DPA | Sertifika |
|---|---|---|---|---|---|
| Daily.co | Video mülakat (ATS) | ABD | Mülakat katılımcı ad, zaman damgası | ✅ | SOC 2 Type II |
| Proxycurl | LinkedIn profil enrichment | ABD | Aday LinkedIn URL + public profil | ⏳ sürüyor | — |
| Azure OpenAI | AI yardım asistanı (HelpWidget) | Türkiye (veri residency zorunlu) | Anonymised chat prompt | ✅ | Azure sertifika setine dahil |
| Azure Monitor / Log Analytics | Observability | TR Central | Technical log (PII redact sonrası) | ✅ | Azure sertifika setine dahil |

## Tier 3 — Yalnız teknik destek, müşteri verisine temas yok

| Vendor | Amaç | Lokasyon |
|---|---|---|
| GitHub | Kaynak kod, CI/CD | ABD |
| NPM registry | Paket dağıtımı | ABD |
| Azure DevOps | Build artifacts | TR Central |
| Sentry | Error tracking (PII scrub sonrası) | EU |
| ClamAV project | Virus signature güncellemeleri | Açık kaynak |

## Değişiklik günlüğü

| Tarih | Değişiklik |
|---|---|
| 2026-04-22 | İlk yayın |
| — | Proxycurl DPA imzası beklemede — Q2 2026 tamamlanacak |

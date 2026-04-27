# Vendor & Supplier Management Policy

**ISO 27001 A.5.19-22 · SOC 2 CC9.1**
**Versiyon:** 1.0 · 2026-04-22

## Subprocessor sınıflandırması
| Kategori | Örnek | DD seviyesi |
|---|---|---|
| **Tier 1** — müşteri verisi işler | Clerk (auth), Azure (hosting), Iyzico/Stripe (ödeme), DocuSign (e-imza) | SOC 2 Type II + ISO 27001 + DPA + SLA ≥99.9% |
| **Tier 2** — yardımcı, veri temas ederse anonymised | Proxycurl, Daily.co, Azure OpenAI, Grafana Cloud | SOC 2 Type II veya eşdeğer + DPA |
| **Tier 3** — yalnız teknik destek | GitHub, NPM registry, JetBrains | Temel güvenlik değerlendirmesi |

## Due-diligence adımları (yeni vendor)
1. **İhtiyaç gerekçesi** — eng lead / product yazılı.
2. **Güvenlik anketi** — SIG Lite veya CAIQ.
3. **Sertifikaları iste** — SOC 2, ISO 27001, PCI (geçerliyse).
4. **DPA imzası** (Tier 1 + 2).
5. **Kimlik erişim planı** — vendor'un bizim sistemlere erişimi var mı?
6. **Exit planı** — veri taşınması nasıl olacak?
7. **CISO onayı** (Tier 1 için).

## Periyodik review
- **Quarterly:** Tier 1 vendor'ların incident/operational değişimi.
- **Yıllık:** Sertifika tazeleme (SOC 2 Type II yıllık yenilenir).
- **Ad-hoc:** Vendor'un bildirilmiş ihlali olursa 48 saat içinde risk değerlendirme.

## Register
`compliance/subprocessors.md` — güncel vendor listesi (public, /guven sayfasına kaynak).

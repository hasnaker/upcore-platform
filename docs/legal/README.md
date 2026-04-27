# Legal Templates — Review & Signature Checklist

**Status:** All templates are **DRAFT**. Production use requires lawyer review.
**Last updated:** 2026-04-24

---

## Template İnventarı

| Dosya | Amaç | Durum |
|---|---|---|
| [`legal/templates/msa-template-tr.md`](../../legal/templates/msa-template-tr.md) | Master Service Agreement (50+ çalışan müşteri) | DRAFT |
| [`legal/templates/sla-99.5.md`](../../legal/templates/sla-99.5.md) | SLA — KOBİ/Growth/Platform | DRAFT |
| [`legal/templates/sla-99.9.md`](../../legal/templates/sla-99.9.md) | SLA — Enterprise | DRAFT |
| [`legal/templates/limitation-of-liability.md`](../../legal/templates/limitation-of-liability.md) | Sorumluluk Sınırlaması (MSA Ek-4) | DRAFT |
| [`legal/templates/tos-tr.md`](../../legal/templates/tos-tr.md) | ToS (public `/sartlar` kaynağı) | DRAFT |
| [`legal/templates/dpa-annex.md`](../../legal/templates/dpa-annex.md) | Data Processing Addendum (MSA Ek-3) | DRAFT |

---

## Avukat Review Checklist

Her template'in üst satırında `⚠️ DRAFT` banner'ı bulunmalıdır.

### Review öncesi kontrol

- [ ] Tüm placeholder (`[___]`, `[MÜŞTERİ]`) doldurulmuş veya belirgin bırakılmış
- [ ] Tutarlı terminoloji (Hizmet/Ürün/Platform — tek terim seç)
- [ ] KVKK atıfları güncel (2024 sonrası mevzuat)
- [ ] Azure region bilgisi doğru (westeurope)
- [ ] Tarih alanları güncel
- [ ] İmza bölümü var
- [ ] VKN/Mersis bilgileri doldurulmuş

### Review sırasında odak

- [ ] **Sorumluluk sınırlaması** — Limitation of Liability'nin Borçlar Kanunu
  Madde 115 ile uyumu
- [ ] **KVKK Madde 9 yurt dışı aktarım** — SCC + açık rıza yeterli mi?
- [ ] **KVKK Madde 12 veri güvenliği** — teknik önlemler yeterli mi?
- [ ] **SLA kredi mekaniği** — TBK 20 (genel işlem koşulları) sınırları içinde mi?
- [ ] **Fesih sonrası veri export hakkı** — TKHK ve KVKK uyumu
- [ ] **Fikri mülkiyet** — Müşteri Verisi sahipliği net mi?
- [ ] **Uygulanacak hukuk** — İstanbul mahkemeleri yetkili (TBK 17)
- [ ] **Tüketici müşteri** — TKHK koruma hükümleri gerekli mi?
- [ ] **Yıllık fiyat artışı** — tek taraflı artış şartı TBK 115'e uygun mu?

### Review sonrası

- [ ] Değişiklikler ayrı bir commit'le işlenir (avukat yorumu review log)
- [ ] DRAFT banner kaldırılır, "APPROVED — v1.0" eklenir
- [ ] MSA/DPA/SLA versiyonları birlikte güncellenir (uyum kontrolü)
- [ ] DocuSign veya eImzaTR üzerinden template oluşturulur
- [ ] `/sartlar` ve `/gizlilik` public sayfaları senkron edilir

---

## İmza Süreci

### 1. SME müşteri (aylık abonelik, Growth plan)

- Online checkout akışında `/sartlar` ve `/gizlilik` onay kutusu
- Ayrı imza gerektirmez
- DocuSign ile opsiyonel MSA imzası (talep halinde)

### 2. Enterprise müşteri (custom MSA)

1. Satış: intro call → proposal
2. Hukuk: UpCore tarafı MSA + SLA + DPA draft gönderir
3. Müşteri hukuku review + red-line
4. İki tur revision
5. Final + DocuSign
6. İmza sonrası:
   - `ops/contracts/<tenant-slug>-msa-YYYYMMDD.pdf` arşivine ekle
   - Tenant metadata'sına `contract_id` bağla
   - Satış CRM'e closed-won kaydı

### 3. Public/Belediye müşteri (KİK 4734)

- İhale süreci — özel hukuk mevzuatına tabi
- `compliance/kamu-ihale/` altında ayrı şablonlar

---

## Kritik Kararlar (Legal Lead İnisiyatifi)

Aşağıdaki kararlar avukat tarafından verilmeli, repo'da trade-off kayıtlı:

1. **Liability cap 1× mi 1.5× mi?** — Şu an 1.5× (bkz `limitation-of-liability.md`).
   Rakiplerin (People.ai, Lattice) cap'i 12 ay × 1×. Enterprise talebi gelirse
   1× + ayrı artırılmış ürün sigortası alternatifi sunulabilir.
2. **KVKK idari para cezası kim öder?** — Draft: ihlali yapan Taraf. Müşteri
   kendi çalışan bildirimini zamanında yapmadıysa ve UpCore kaynaklı değilse
   Müşteri sorumludur.
3. **SLA kredi yıllık mı aylık mı hesaplanır?** — Draft: aylık. Enterprise
   isteyebilir → MSA 4.3 esnek.

---

## Versioning

- Template dosyaları semver ile etiketlenir: `v1.0`, `v1.1`, vb.
- Müşteri imzaladığı sürümü `ops/contracts/<tenant>-msa-v1.0.pdf` olarak sakla.
- UpCore şablon güncellediğinde eski müşteri otomatik yenilenmez — renewal
  tarihinde yeni sürüme geçiş önerilir.

---

## İletişim

- **Hukuk danışmanı:** (2026-Q3 atanacak — dış avukatlık ofisi)
- **DPO:** kvkk@upcore.io (2026-Q3 sertifikalı DPO atanacak)
- **UpCore iç hukuk:** hukuk@upcore.io

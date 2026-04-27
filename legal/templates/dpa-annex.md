> ⚠️ **DRAFT — Avukat onayı öncesi üretim sözleşmesi için KULLANMAYIN.**

# DPA — Data Processing Addendum (Veri İşleme Ek Sözleşmesi)

**Sürüm:** Draft v1 · **Tarih:** 2026-04-24
MSA Ek-3. KVKK + GDPR çift uyumlu.

---

## 1. Taraflar ve Rol Tanımı

**Veri Sorumlusu (Data Controller):** Müşteri
**Veri İşleyen (Data Processor):** UpCore Teknoloji A.Ş.

UpCore, Müşteri adına ve Müşteri'nin belirlediği amaçlar için kişisel veri
işler.

---

## 2. İşleme Amacı, Süresi, Kapsamı

### 2.1 Amaç

- İK süreçleri yönetimi (özlük, performans, izin, bordro)
- Çalışan bağlılığı ölçümü (pulse anket, BAT-12-TR)
- Tükenmişlik öngörüsü (ML modeli)
- İç mobilite ve succession planning

### 2.2 Süre

MSA yürürlüğü boyunca + fesih sonrası 90 gün salt-okunur saklama.

### 2.3 Kapsam

#### Veri Sahibi Kategorileri
- Müşteri'nin çalışanları
- Müşteri'nin aday havuzundaki kişiler
- Müşteri'nin kullanıcıları (admin, HR specialist, yönetici)

#### İşlenen Veri Kategorileri
- Kimlik (ad, soyad, TCKN — pgcrypto encrypted)
- İletişim (e-posta, telefon, adres)
- Mesleki (unvan, departman, CV)
- Performans (OKR, 360° skorları)
- Bağlılık (pulse anket yanıtları, BAT-12-TR)
- Türetilmiş (burnout skoru, UpCap skoru)
- Sağlık (sadece bordro modülü için engellilik raporu — pgcrypto encrypted,
  Madde 6 açık rıza ile)

---

## 3. UpCore Yükümlülükleri

### 3.1 Talimat Bağlılığı

UpCore, Müşteri'nin yazılı talimatları dışında kişisel veri işlemez. KVKK
veya yasa gereği işlemesi halinde Müşteri'yi önceden bilgilendirir.

### 3.2 Teknik Önlemler

- TLS 1.3 in-transit, AES-256 at-rest
- pgcrypto column-level encryption (TCKN, IBAN, sağlık verisi)
- Row-Level Security (RLS) ile tenant izolasyonu
- Azure Key Vault rotasyon (90 gün)
- SSDLC, SAST/DAST, dependency scanning
- İki faktörlü kimlik doğrulama (admin erişim)

### 3.3 İdari Önlemler

- ISO 27001 hazırlık (sertifika 2026-Q4)
- SOC 2 Type II (2026-Q4)
- Çalışan gizlilik sözleşmeleri
- Yıllık güvenlik eğitimi
- Minimum yetki prensibi (RBAC)

### 3.4 Alt İşleyenler (Sub-processors)

UpCore aşağıdaki alt işleyenleri kullanır:

| Alt İşleyen | Hizmet | Konum | KVKK Uyum |
|---|---|---|---|
| Microsoft Azure | Altyapı (PG, Blob, ACA) | westeurope (NL) | ✓ SCC + DPA |
| Clerk | Kimlik doğrulama | us-east-1 (US) | ✓ DPA + Adequacy waiver |
| Iyzico | Ödeme (TR kart) | Türkiye | ✓ |
| Stripe | Ödeme (global kart) | us-east-1 + eu | ✓ SCC + DPA |
| Plausible Analytics | Web analitik (anonim) | de (DE) | ✓ GDPR native |
| Azure OpenAI | LLM (ML özellikleri) | westeurope | ✓ SCC + DPA |

Yeni alt işleyen eklenmesi 30 gün önceden Müşteri'ye bildirilir. Müşteri makul
itirazı halinde MSA'yı feshedebilir.

### 3.5 Personel Erişimi

UpCore personeli, Müşteri Verisi'ne yalnızca gerekli durumlarda (destek talebi,
incident response) erişir. Tüm erişimler audit log'a (7 yıl WORM) kaydedilir.

---

## 4. Yurt Dışı Aktarım (KVKK Madde 9)

### 4.1 Lokasyon

Birincil veri lokasyonu: **Azure westeurope (Amsterdam, Hollanda)**.
Yedekleme: Azure northeurope (Dublin, İrlanda) geo-redundant.

### 4.2 Hukuki Temel

- Müşteri'nin bu DPA'yı imzalamakla verdiği **açık rıza** (KVKK Madde 9/1).
- Standard Contractual Clauses (SCC 2021/914) — Müşteri, alt işleyen Microsoft'un
  SCC'ye tabi olduğunu kabul eder.
- Hollanda, KVKK Kurul tarafından yeterli koruma sağlayan ülkeler listesinde
  değerlendirilmektedir.

### 4.3 Çalışan Onamı

Müşteri, çalışanlarından pulse anket öncesi açık rıza alır. UpCore onam formu
şablonu sunar (`compliance/kvkk/calisan-onam-formu.md`).

---

## 5. Veri Sahibi Hakları

### 5.1 Madde 11 Talepler

Müşteri, çalışandan gelen Madde 11 taleplerini UpCore'a yönlendirir. UpCore
30 gün içinde destekleyici bilgi sağlar:

- Erişim: `GET /api/v1/data-subjects/{id}/export` (JSON)
- Düzeltme: Admin panel UI
- Silme: `DELETE /api/v1/data-subjects/{id}` (sert silme — audit log istisna)
- İtiraz (otomatik karar): `POST /api/v1/data-subjects/{id}/opt-out-ml`

### 5.2 Self-servis Portal

Çalışan doğrudan `panel.upcore.io/kvkk` üzerinden:
- Verilerini indirebilir
- Düzeltme talebi açabilir
- Silme talebi açabilir (İK onayı + legal hold kontrolü sonrası işlenir)

---

## 6. Veri İhlali Bildirimi

### 6.1 UpCore'un Yükümlülüğü

Veri ihlali tespit edildiğinde UpCore, Müşteri'ye **24 saat** içinde yazılı
bildirir (Enterprise SLA için). Bildirim şunları içerir:

- İhlalin niteliği
- Etkilenen veri kategorileri ve veri sahibi sayısı
- Muhtemel sonuçlar
- Alınan/planlanan önlemler

### 6.2 Müşteri'nin Yükümlülüğü

Müşteri, veri sorumlusu sıfatıyla KVKK Kurul'a **72 saat** içinde bildirim
yapar. UpCore gerekli teknik bilgi ve log kayıtlarını sağlar.

---

## 7. Audit Hakkı

Müşteri, yılda bir kez UpCore'un bu DPA'ya uyumunu denetleme hakkına sahiptir.
Denetim 30 gün önceden yazılı talep ile planlanır; çalışma saatleri içinde
gerçekleştirilir.

Enterprise müşteri için SOC 2 Type II raporu, bağımsız denetim kabul edilir
(ayrıca on-site denetim talep edilmezse).

---

## 8. Saklama ve Silme

### 8.1 Saklama

| Veri kategorisi | Süre |
|---|---|
| Çalışan özlük | İş akdi sonrası 10 yıl |
| Bordro + SGK | 10 yıl (VUK) |
| Pulse anket | 12 ay sonra k-anonymize (k≥5) |
| Audit log | 7 yıl WORM |
| Oturum/cookie | Oturum + 90 gün |

### 8.2 Silme

MSA fesih sonrası 90 gün içinde UpCore, Müşteri'nin tüm verisini geri
dönüşümsüz şekilde siler. Silme sertifikası e-posta ile Müşteri'ye gönderilir.

İstisna: Audit log (KVKK 7 yıl zorunluluğu), yasal hold altındaki veriler.

---

## 9. SCC (Standard Contractual Clauses) Eki

Microsoft Azure ile UpCore arasındaki SCC 2021/914 tam metni
https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum
adresinden erişilebilir ve bu DPA'nın bütünleyici parçasıdır.

---

## 10. İmzalar

(DPA, MSA'nın Ek-3 parçası olarak imzalanır; ayrı imza gerekmez.)

---

## Referanslar

- MSA: `legal/templates/msa-template-tr.md`
- KVKK: https://www.kvkk.gov.tr/
- SCC 2021/914: https://eur-lex.europa.eu/eli/dec_impl/2021/914
- Azure DPA: https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum

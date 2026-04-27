# Veri İşleyen Sözleşmesi (DPA) — Şablon

**Taraflar:**
- **Veri Sorumlusu:** [Müşteri Şirket Adı] (TENANT)
- **Veri İşleyen:** UpCore A.Ş. ("UpCore")

**İmza tarihi:** [...]
**Versiyon:** 1.0 · 2026-04-22

> Bu DPA, UpCore SaaS Sözleşmesi'nin ayrılmaz parçasıdır ve KVKK 6698 sayılı Kanun m.12/5 ve
> Veri İşleyenler Rehberi'ne uygun düzenlenmiştir. Çelişki durumunda bu EK esas alınır.

---

## 1. Tanımlar

- **Kişisel Veri:** TENANT'ın çalışanları, yöneticileri, adayları hakkında UpCore platformunda
  işlenen her türlü bilgi.
- **İşleme:** KVKK m.3/e anlamında.
- **Özel Nitelikli Veri:** Psikometrik skorlar (BAT-TR/UWES/UpCap-TR), sağlık, cinsiyet, din.

## 2. İşleme Konusu ve Amacı

UpCore, yalnızca TENANT'ın talimatı doğrultusunda ve SaaS sözleşmesindeki amaçlarla işlem yapar.
TENANT'ın talimatı olmadan:
- Veriyi başka amaçla kullanmaz.
- Üçüncü kişilere aktarmaz (onaylı subprocessor listesi hariç — EK-A).
- Kamuya açıklamaz.

## 3. Veri Kategorileri

Bkz. EK-B (veri envanteri özeti). Genel olarak:
- Kimlik, iletişim, istihdam, bordro, psikometrik, performans.

## 4. Güvenlik Önlemleri

UpCore KVKK m.12 uyum ve ISO 27001/SOC 2 çerçevesinde:
- AES-256 at rest, TLS 1.3 in transit
- RLS ile tenant izolasyonu
- MFA + RBAC erişim
- Audit log 7 yıl
- Quarterly access review
- Yıllık pentest
- Incident response 72 saat bildirim

Detay: `compliance/iso27001/controls.md`

## 5. Alt İşleyenler (Subprocessor)

UpCore, TENANT'a **yazılı bildirim** + **10 iş günü itiraz süresi** şartıyla alt işleyen
eklemek/değiştirmek hakkı saklıdır. Güncel liste: `https://upcore.app/guven/subprocessors`.
TENANT itirazı halinde UpCore makul alternatif sunar veya sözleşme feshi hakkı doğar.

## 6. TENANT Hakları

UpCore, TENANT'ın:
- Denetim talebini (yılda 1 kez, 30 gün önceden) kabul eder.
- Veri sahibi taleplerini iletmesini destekler (30 gün SLA).
- Veriyi sözleşme sonunda 30 gün içinde iade veya imha eder (TENANT seçimi).

## 7. Veri İhlali

- UpCore, ihlali **72 saat içinde** TENANT'a bildirir (KVKK m.12/5 uyumu).
- Bildirim: kapsam, etkilenen veri tipi, etkilenen sayı, önlem, iletişim noktası.
- TENANT, kendi veri sahiplerini bilgilendirme yükümlülüğünden sorumludur.

## 8. Sınır ötesi aktarım

Türkiye dışına aktarım yapılması gerekirse (subprocessor), KVKK m.9 uyumu:
- Açık rıza, veya
- Yeterli koruma bulunan ülke listesi, veya
- Standart sözleşme maddeleri (SCC).

## 9. Süre ve Fesih

- DPA, SaaS Sözleşmesi süresince geçerlidir.
- Fesih sonrası 30 gün: TENANT export/silme talebi (KVKK m.11).
- 30 gün sonra: hard delete + backup silme isteği Azure'a 30 gün SLA.

## 10. Sorumluluk

- UpCore, kendi kusurundan doğan KVKK cezasını tazmin eder (SaaS sözleşmesindeki sınır saklı).
- TENANT kendi yönlendirme hatalarından sorumludur.

---

## EK-A: Onaylı Alt İşleyenler

(En güncel liste: `compliance/subprocessors.md`)

| Alt İşleyen | Amaç | Lokasyon |
|---|---|---|
| Microsoft Azure | Hosting | TR Central, EU North |
| Clerk | Kimlik | ABD |
| Iyzico | Ödeme TR | Türkiye |
| Stripe | Ödeme global | ABD/İrlanda |
| DocuSign | E-imza | ABD |
| Daily.co | Video mülakat | ABD |
| Proxycurl | LinkedIn profil | ABD |
| Azure OpenAI | AI asistan | TR (veri residency) |

## EK-B: Veri Envanteri Özeti

Bkz. `compliance/kvkk/veri-envanteri.md` § 2.

## İmzalar

| Taraf | Ad Soyad | Pozisyon | İmza | Tarih |
|---|---|---|---|---|
| TENANT | | | | |
| UpCore | Hasan Aker | CEO & CISO | | |

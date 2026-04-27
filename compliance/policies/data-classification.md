# Data Classification Policy

**ISO 27001 A.5.12-13 · SOC 2 C1.1**
**Versiyon:** 1.0 · 2026-04-22

## Sınıflar

| Seviye | Tanım | Örnekler | İzin verilen taşıyıcı |
|---|---|---|---|
| **Public** | Kamuya açık, sızıntı riski yok | Marketing site içeriği, logo, fiyat listesi | Tüm kanallar |
| **Internal** | Çalışana açık, dışarı sızması itibar riski | Mimari doc, roadmap, ekip telefonları | Çalışan e-postası, Slack |
| **Confidential** | Sınırlı çalışan, sızması iş riski | Ücret, müşteri listesi, kaynak kod, kapsamlı DB dump | Şifrelenmiş kanal, onaylı paylaşım |
| **KVKK-Özel** | Kişisel veri + özel nitelikli veri | TCKN, sağlık skorları (BAT-TR), banka hesabı, dinî bilgi | RLS + encryption + audit log |

## Etiketleme
- **DB kolonları:** `comment` ile `pii_level=<seviye>` (migration 024).
- **Dosya paylaşımı:** klasör adı prefix `[CONF]`, `[KVKK]`.
- **Slack:** private channel + DM zorunlu Confidential+ için.

## İşlem kuralları

| | Public | Internal | Confidential | KVKK-Özel |
|---|---|---|---|---|
| Paylaşım yolu | Email | Email + Slack | Drive (need-to-know) | Audit log + özel form |
| Saklama | Süresiz | 2 yıl | 5 yıl | KVKK retention (işlem süresince + yasal süre) |
| Yok etme | Standart | Standart | Cryptoshred | Cryptoshred + sertifika |
| Yedek şifreleme | — | Gerekli | Zorunlu | Zorunlu + key rotation |
| Üretim erişimi | Herkes | Tüm çalışan | Need-to-know | İmtiyazlı + 2FA + audit |

## KVKK özel veri listesi
- TCKN, pasaport, sürücü belgesi
- Banka IBAN + hesap
- Sağlık verisi (rapor, psikolojik skor, ilaç)
- Cezai sicil
- Biyometrik (fotoğraf, parmak izi)
- Cinsel yaşam, din, etnik köken
- Üyelik (dernek, sendika)
- BAT-TR, UWES, UpCap-TR skorları (psikometrik veri — özel nitelikli sayılır)

## Şifreleme kuralı
Confidential+ tüm veri **at-rest AES-256 + in-transit TLS 1.3** zorunludur.
KVKK-Özel için ek column-level pgcrypto veya pseudonymisation.

## Logging kuralı
Confidential+ alanlar application log'a **yazılamaz**. Zerolog redact filter:
`zerolog.Interface(SensitiveMask)`. PII logger middleware (pkg/middleware/pii_redact.go).

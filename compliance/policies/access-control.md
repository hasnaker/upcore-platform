# Access Control Policy

**ISO 27001 Annex A.5.15–18, A.8.2–5 · SOC 2 CC6**
**Versiyon:** 1.0 · **Tarih:** 2026-04-22

## 1. İlkeler
- **Least privilege** + **need-to-know**
- **Segregation of duties** — tek kişi production'a push edip merge edemez.
- **Re-certification** — tüm erişimler quarterly gözden geçirilir.

## 2. Kullanıcı yaşam döngüsü
| Aşama | Sorumlu | Kontrol |
|---|---|---|
| Joiner | HR + IT | Clerk SCIM ile provisioning; default role = `employee` |
| Mover | HR → IT | Rol değişince eski erişimler 24 saatte kaldırılır |
| Leaver | HR | Son gün Clerk user disabled + session revoke + badge iade |

## 3. Ayrıcalıklı erişim
- **Prod kubectl:** sadece 3 kişi (CISO + 2 SRE); her komut Azure Activity Log.
- **Prod DB admin:** sadece 2 kişi; break-glass password vault'da, kullanım post-hoc onaylı.
- **Azure subscription Owner:** sadece CISO.

## 4. MFA
- Clerk üzerinden tüm kullanıcılar için hardware TOTP veya WebAuthn zorunlu.
- Yalnız SMS OTP **yetersiz** — admin hesaplar için reddedilir.

## 5. Şifre politikası
- Minimum 12 karakter, Clerk zxcvbn skoru ≥ 3.
- **Paylaşılmaz.** Ortak hesap yasak.
- Unutma durumunda self-service reset (Clerk magic link).

## 6. API key
- `upc_live_*` formatında; bcrypt hash'lenir; tek seferlik gösterim.
- Rate limit per key (default 60/dk).
- Quarterly rotation zorunlu; 90 gün boşta kalan anahtar otomatik devre dışı.

## 7. Tenant izolasyonu (müşteri verisi)
- PostgreSQL RLS her tabloda; `app.tenant_id` session-local.
- Her repo method önce `pkg/db.SetRLSTenant(ctx, tx, tenantID)` çağırır.
- Linter kuralı (`//go:linter rls-required`) bypass eden handler CI'da fail.

## 8. Re-certification
- **Quarterly:** `scripts/access-review.sh` her yöneticiye "ekip erişim listesi" email.
- 5 iş günü içinde onay gelmezse → IT erişimi askıya alır.
- Sonuç `compliance/evidence/access-reviews/YYYY-QN.csv` dosyasında.

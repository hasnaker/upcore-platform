===PAGE id=tenant-yeni-tenant-olusturma title=Yeni tenant oluşturma pos=1===
# Yeni tenant oluşturma

UpCore'da yeni bir müşteri şirket kaydı.

## Adımlar

1. **Admin panel > Tenants > + Yeni**
2. Temel bilgiler:
   - Şirket unvanı
   - Vergi numarası
   - MERSİS numarası
   - Yıllık çalışan sayısı aralığı
   - İletişim kişisi (ad, e-posta, telefon)
3. Plan seçimi (Starter / Growth / Enterprise / Enterprise Plus)
4. Billing setup (fatura adresi, ödeme yöntemi)
5. Initial admin user oluşturma → Clerk davet e-postası

## Arka plan işlemleri

- Yeni Postgres schema (`tenant_<uuid>` pattern)
- RLS (Row-Level Security) policies otomatik
- Storage bucket oluşur (blob, dosyalar)
- Billing Stripe customer yaratılır (veya İyzico)
- Default feature flags uygulanır (plana göre)

## Onboarding başlat

Tenant oluştuktan sonra ilk admin user:
1. Clerk daveti kabul eder
2. Şifre + MFA oluşturur
3. Otomatik **onboarding sihirbazı** başlar
4. İlk kurulum 15-30 dk ([Onboarding wizard](./tenant-onboarding-wizard))

===PAGE id=tenant-onboarding-wizard title=Onboarding wizard pos=2===
# Onboarding wizard

Yeni tenant için otomatik 6 adımlı sihirbaz.

## Adımlar

1. **Şirket profili** — logo, renk, saat dilimi
2. **Departman ağacı** — hiyerarşi kurma
3. **Çalışan import** — CSV yükleme (maks 10 000)
4. **Modül seçimi** — Sürdürme, Koruma, vb. etkinleştirme
5. **SSO konfigürasyonu** — opsiyonel SAML/OIDC
6. **KVKK VERBIS rehberi** — tescil talimatları

## Tamamlama kriterleri

Her adım onaylanmadan sonraki görünmez. Tüm adımlar bittiğinde dashboard açılır.

## Progress kaydet

Tenant istediği zaman çıkıp dönebilir — progress otomatik kayıt.

===PAGE id=tenant-csv-import title=CSV ile çalışan import pos=3===
# CSV ile çalışan import

Toplu çalışan aktarımı.

## CSV şablonu

22 zorunlu sütun:
- tckn
- ad
- soyad
- dogum_tarihi (YYYY-MM-DD)
- isim_soyisim
- email
- telefon
- departman (varolan departman ID)
- pozisyon
- personel_tipi (MEMUR_657 / 4B / 4857 / STAJYER)
- ise_giris_tarihi
- brut_maas
- iban
- sgk_sicil_no
- askerlik_durumu
- medeni_durum
- egitim
- acil_iletişim_ad
- acil_iletişim_telefon
- adres
- engellilik_orani (0-100)
- yabanci_dil (JSON, örn ["en:C1","de:A2"])

## Validation

- TCKN Mod 11 algoritma
- IBAN TR format (26 karakter)
- Tarih formatı
- Maaş > asgari ücret
- Departman ID mevcut
- Zorunlu alanlar boş değil

## Error handling

- Preview'da hatalar satır-bazlı gösterilir
- Hatalı satırlar exclude edilerek devam (opsiyonel)
- Tüm hatalar CSV olarak export

===PAGE id=tenant-ilk-modul-secimi title=İlk modül seçimi pos=4===
# İlk modül seçimi

Tenant için hangi modüller aktif olacak?

## Modül bağımlılıkları

- Sürdürme → temel (çoğu tenant açar)
- Koruma → Sürdürme gerekli
- Performans → bağımsız
- Mobility → Performans (9-kutu için) önerilir
- Geliştirme → bağımsız
- İK Ops → bordro için gerekli
- Analitik → tüm diğerlerinin verisi
- KVKK/GRC → zorunlu (50+ çalışan)

## Plan-modül matrisi

| Plan | Dahil modüller |
|---|---|
| Starter | Sürdürme + İK Ops |
| Growth | + Performans + Koruma |
| Enterprise | + Mobility + Geliştirme + Analitik + KVKK/GRC |
| Enterprise Plus | Hepsi + advanced features |

## Modül sonradan ekleme

Plan yükseltildiğinde otomatik ekleme. Orta plan değişiminde veri tutulur.

===PAGE id=iam-sso-saml title=SSO — SAML kurulum pos=1===
# SSO — SAML 2.0 kurulum

Active Directory / Azure AD / Okta / PingIdentity entegrasyonu.

## Konfigürasyon

**Admin > IAM > SSO > SAML**

1. UpCore'dan SP (Service Provider) bilgileri:
   - Entity ID: `https://app.upcore.io/sso/saml`
   - ACS URL: `https://app.upcore.io/sso/saml/callback`
   - Logout URL: `https://app.upcore.io/sso/saml/logout`
2. IdP (Identity Provider) metadata XML'ini UpCore'a yükle
3. Attribute mapping:
   - `NameID` → email
   - `FirstName` → ad
   - `LastName` → soyad
   - `Department` → department_code (opsiyonel)
   - `Manager` → manager_email (opsiyonel)
4. Test login (IdP-initiated + SP-initiated)

## Azure AD özel

- Enterprise Application ekle
- Gallery'de "UpCore" ara — varsa otomatik kurulum
- Manuel: "Non-gallery application" + SAML config

## Okta özel

- Integration Network'te UpCore Connector
- 2FA zorunlu kılma
- Group push (roller için)

## PingIdentity

- SSO → SAML 2.0 application
- ACS + Entity URL

## Troubleshooting

- "Invalid signature" → metadata X.509 sertifikası yanlış
- "User not found" → email attribute mapping yanlış
- "Expired assertion" → saat senkronu (NTP)

===PAGE id=iam-sso-oidc title=SSO — OIDC (OpenID Connect) kurulum pos=2===
# SSO — OIDC (OpenID Connect) kurulum

Google Workspace, GitHub, Apple Sign-in, kendi IdP.

## Konfigürasyon

**Admin > IAM > SSO > OIDC**

1. UpCore'dan OIDC client:
   - Redirect URI: `https://app.upcore.io/sso/oidc/callback`
   - Scope: `openid profile email`
2. IdP tarafında:
   - Client ID + Client Secret alma
   - Redirect URI kayıt
3. UpCore'a client credentials yapıştır
4. Scope mapping
5. Test

## Google Workspace

- admin.google.com > Security > API controls
- "Add OAuth client"
- Restrict to organization (opsiyonel)

## GitHub

- Settings > OAuth Apps > New OAuth App
- Enterprise tenant: Enterprise seviyesinde SSO (SAML tercih)

## Custom OIDC

RFC 6749 + OIDC 1.0 uyumlu her IdP destekleniyor. Keycloak, Authentik, Auth0.

===PAGE id=iam-scim-kullanici-senkron title=SCIM kullanıcı senkron pos=3===
# SCIM 2.0 kullanıcı senkron

Otomatik kullanıcı provisioning + deprovisioning.

## SCIM endpoint

- Base URL: `https://api.upcore.io/scim/v2`
- Auth: Bearer token (Admin panelinden alınır)
- Supported resources: Users, Groups

## IdP'den push

- **Azure AD:** Provisioning tab > Automatic > UpCore connector
- **Okta:** Provisioning > Create Users + Update + Deactivate
- **OneLogin:** SCIM provisioning enabled

## Attribute mapping

| IdP alanı | UpCore alanı |
|---|---|
| externalId | tckn (veya employee_id) |
| userName | email |
| name.givenName | first_name |
| name.familyName | last_name |
| title | position |
| department | department_code |
| manager | manager_email |
| active | is_active |

## Deprovisioning

IdP'de kullanıcı deaktif olursa UpCore:
- **Immediate:** Hesap disable, aktif oturumlar sonlandırılır
- **30 gün:** Veri archive
- **Saklama politikası:** Yasal saklama sürelerine uyum

## Troubleshooting

- Duplicate user: TCKN + email eş olmalı
- Permission denied: Token izin kapsamı
- Timeout: Büyük batch için async akış

===PAGE id=iam-rbac-rol-yonetimi title=RBAC rol yönetimi pos=4===
# RBAC (Role-Based Access Control) rol yönetimi

## Built-in roller

| Rol | Açıklama |
|---|---|
| super_admin | Platform yöneticisi (UpCore çalışanı) |
| tenant_admin | Tenant yöneticisi — tüm tenant erişimi |
| hr_admin | İK uzmanı — çalışan + pulse + müdahale |
| hr_specialist | Alt-İK — belirli departman |
| manager | Yönetici — kendi ekibi |
| employee | Çalışan — sadece kendi verileri |
| auditor | Denetim — read-only, audit log erişim |
| billing_admin | Fatura + kullanım + plan |
| security_admin | IAM + SSO + audit log |
| api_user | API-only hesap (servis-servis) |

## Custom rol oluşturma

**Admin > IAM > Roller > + Yeni**

1. Rol adı + açıklama
2. Permission matrisi:
   - Modüller (okuma / yazma / silme)
   - Hassas aksiyonlar (impersonation, export)
   - Yönetilen scope (tüm tenant / departman / kendi)
3. Atama (kullanıcılar)

## Permission granularity

- Modül-level: `surdurme.read`, `koruma.write`
- Nesne-level: `employee:{id}.read` (owner vs başkası)
- Aksiyon-level: `user.impersonate`, `data.export`

## En iyi uygulamalar

- **Least privilege:** Minimum izin
- **Role review:** 6 ayda 1 gözden geçirme
- **Temporary access:** Süreli izinler (örn. 30 gün auditor)
- **Segregation of duties:** Billing ≠ İK, Security ≠ IT

## Audit

Her rol değişim kayıt edilir:
- Kim değiştirdi
- Eski izin → yeni izin
- Sebep (opsiyonel yorum)

===PAGE id=iam-mfa-zorunlu-kilma title=MFA zorunlu kılma pos=5===
# MFA zorunlu kılma

## Politika seviyeleri

- **Advisory** — çalışan öneri alır, zorunlu değil
- **Enforced for admin** — sadece admin rolleri
- **Enforced for all** — tüm kullanıcılar
- **Enforced with grace period** — 30 gün içinde kurun

## MFA metotları

| Metot | Güvenlik | Hız | Önerilir mi? |
|---|---|---|---|
| Authenticator app (TOTP) | Yüksek | 2 sn | Evet |
| SMS | Orta | 5 sn | SIM-swap riski, yedek olabilir |
| E-posta OTP | Düşük | 10 sn | Sadece yedek |
| WebAuthn / FIDO2 | Çok yüksek | 1 sn | Ultra-güvenli, öneri |
| Backup kodları | Yüksek | Anlık | Kurtarma için zorunlu |

## Kurulum akışı

1. Kullanıcı giriş
2. MFA kurulmamışsa zorunlu flow
3. Authenticator app + QR → 6 haneli kod onay
4. 10 adet backup code indirme
5. Tamamlama

## Cihaz kaybı

Çalışan cihazını kaybettiyse:
1. Backup code ile giriş
2. Admin panelden MFA reset (audit log'a yaz)
3. Yeni cihaz kurulum

## Compliance

- SOC 2 Type II: MFA zorunlu (admin + data access)
- ISO 27001: Kontrol A.9.4.2
- KVKK: md. 12 güvenlik tedbiri

===PAGE id=billing-plan-secimi title=Plan seçimi pos=1===
# Plan seçimi

UpCore planlar 2026.

## Plan matrisi

| Özellik | Starter | Growth | Enterprise | Enterprise Plus |
|---|---|---|---|---|
| Aylık fiyat (çalışan başı) | 49 TL | 79 TL | 129 TL | Özel |
| Min çalışan | 50 | 100 | 200 | 1000 |
| Max çalışan | 500 | 2000 | 10 000 | Sınırsız |
| Modüller | Sürdürme, İK Ops | + Performans, Koruma | Hepsi | Hepsi + custom |
| API call limit | 10 000/ay | 100 000/ay | 1M/ay | 10M/ay |
| Veri retention | 3 yıl | 5 yıl | 7 yıl | Özel |
| SSO | — | SAML 1 tane | SAML 3 tane + OIDC | Sınırsız |
| SCIM | — | — | ✓ | ✓ |
| SLA | 99% | 99.5% | 99.9% | 99.99% |
| Destek | E-posta 48s | E-posta 24s + chat | Dedicated CSM + 4s | 24/7 + 1s |
| Audit log retention | 1 yıl | 3 yıl | 7 yıl | Custom |

## Upgrade akışı

1. **Billing > Plan değiştir**
2. Yeni plan seç
3. Prorate hesap (varolan dönemin kalan kısmı)
4. Ödeme
5. Anında aktifleştirme

## Downgrade

- Dönem sonu etkili (proration yok)
- Veri ayarları: veri kapasite sınırı uygulanır
- Bazı özellikler read-only olur (eski veri kaybolmaz)

===PAGE id=billing-fatura-yonetimi title=Fatura yönetimi pos=2===
# Fatura yönetimi

## Aylık fatura döngüsü

- 1. günde dönem başlar
- Ay sonunda kullanım hesaplanır
- Ayın son gününde fatura oluşur
- 15 gün vade içinde ödeme

## Ödeme yöntemleri

- Kredi kartı (Iyzico)
- Havale/EFT (enterprise)
- Fatura (e-Fatura, Gelir İdaresi)
- Çek (büyük müşteri, özel anlaşma)

## Havale/EFT için

- İş Bankası hesap bilgileri (UpCore Teknoloji A.Ş.)
- Açıklama: fatura numarası
- Süre: 3 iş günü kayıt

## e-Fatura

- Portal: Gelir İdaresi
- Otomatik gönderim şirketin VKN'sine
- PDF + UBL format
- Dijital imza zorunlu

## İndirim kuralları

- Yıllık peşin ödeme: %10 indirim
- 1000+ çalışan Enterprise: negotiable
- STK / Kamu: %20 indirim (başvuru gerekir)
- Educational: %30 indirim

## Fatura adresi değişiklik

- Self-servis: Billing > Fatura bilgileri
- 24 saat içinde güncellenir
- Gelir İdaresi'ne otomatik bildirim (VERBIS ayrı)

===PAGE id=billing-kullanim-metrikleri title=Kullanım metrikleri pos=3===
# Kullanım metrikleri

## Ölçülen metrikler

- **Aktif çalışan sayısı** — son 30 günde girişi olan
- **API call sayısı** — REST + GraphQL + Webhook
- **Storage** — yüklenen dosya + database
- **Bandwidth** — çıkış trafiği (export, API response)
- **Pulse gönderim sayısı** — ay boyunca
- **ML inference** — tahmin + recommendation call

## Sınırı aşma

- **Soft limit:** %85 tüketilince uyarı
- **Hard limit:** %100'de yeni request blok
- **Overage:** Enterprise için elastic (ek ücretli)

## Raporlama

- **Günlük:** Dashboard'da canlı
- **Aylık:** Fatura öncesi özet
- **Yıllık:** Trend analizi

## Optimize için

- Pulse sıklığı düşür (2 haftada 1 → aylık)
- API cache kullan (client tarafı)
- Export limitini değişken (küçük batch)
- ML inference batched (bireysel değil)

===PAGE id=billing-seat-yonetimi title=Seat yönetimi pos=4===
# Seat yönetimi

"Seat" = fatura edilen aktif çalışan slot.

## Seat kuralları

- Çalışan kaydı açıldığında seat tüketilir
- İşten ayrılınca (30 gün sonra) seat geri döner
- Archived çalışan seat tüketmez
- Test kullanıcıları: admin panelden "demo" flag ile seat dışı

## Reserved seats

Enterprise: önceden seat satın alma:
- 100 seat yıllık peşin → %15 indirim
- Sonraki 3 ay her ay 30 yeni çalışan
- Satın alınan seat dönem boyunca kullanılabilir

## Over-seat

Plan sınırını aşarsanız:
- Grace period 7 gün
- Grace sonrası ek seat auto-added (ek fatura)
- Büyüme dönemlerinde plan upgrade önerisi

## Cost center

Büyük şirketler için:
- Departman × seat allocation
- İç fatura (kost center bazlı)
- Yıllık budget tracking

===PAGE id=operasyon-feature-flag title=Feature flag yönetimi pos=1===
# Feature flag yönetimi

Risk almadan yeni özellikleri açma sistemi.

## Feature flag türleri

- **Release flag:** Yeni özellik (gradual rollout)
- **Kill switch:** Hatalı özellik anlık kapatma
- **Experiment:** A/B test
- **Permission:** Tenant bazlı özel feature
- **Plan flag:** Planın gerektirdiği özellikler

## UI akış

**Admin > Operasyon > Feature flags**

Her flag için:
- Ad + açıklama
- Durum: Açık / Kapalı / Belirli segment için
- Yüzde: 0-100 (gradual rollout için)
- Hedef: tüm tenant / belirli tenantlar / belirli rol
- Timeline: log her değişim

## Risk yönetimi

- **Canary deployment:** %5 → %25 → %50 → %100
- **Alarm:** Hata oranı %0.5 artarsa otomatik kill
- **Rollback:** Tek tık geri alma

## Build-time vs runtime

- **Build-time:** Next.js compile-time flag (frontend)
- **Runtime:** API response header'da flag
- **Edge:** CDN / gateway'de A/B routing

## Flag temizlik

Her flag'in bir **son kullanma tarihi** var:
- 30 gün - 90 gün normal
- Süre dolunca flag kaldırılır (code'da tek yol kalır)
- Teknik borç yığılmaz

===PAGE id=operasyon-webhook-konfigurasyon title=Webhook konfigürasyonu pos=2===
# Webhook konfigürasyonu

Event-driven entegrasyon için.

## Desteklenen olaylar

- `employee.created`
- `employee.terminated`
- `pulse.completed`
- `intervention.started`
- `intervention.completed`
- `okr.updated`
- `review.submitted`
- `audit.anomaly_detected`
- `payroll.run_completed`
- `gdpr.request_received`

Tam liste: [Webhook olayları](/docs/developer/webhook/olaylar).

## Endpoint kurulumu

**Admin > Operasyon > Webhooks > + Yeni**

1. Endpoint URL (HTTPS zorunlu)
2. Olay seçimi (subset)
3. Secret (imzalama için)
4. Retry politikası (aşağıda)
5. Test payload gönderim

## Retry politikası

Başarısız webhook için:
- Maks 10 deneme
- Exponential backoff: 1s, 4s, 16s, 64s, 256s, ...
- 48 saat sonra drop + alarm
- Circuit breaker: 50% fail → 5 dakika kapalı

## İmzalama

HMAC-SHA256 ile:
```
X-UpCore-Signature: t=1234567890,v1=abc123...
```

Doğrulama (Node.js):
```js
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(`${timestamp}.${JSON.stringify(body)}`)
  .digest('hex');
```

## Idempotency

Her webhook'ta `X-UpCore-Delivery-Id` header vardır. Consumer retry durumunu bu ID ile ayırt etmeli.

## Payload örneği

```json
{
  "event": "pulse.completed",
  "tenant_id": "tnt_abc123",
  "timestamp": "2026-04-23T14:35:00Z",
  "data": {
    "pulse_id": "pls_xyz789",
    "completion_rate": 0.87
  }
}
```

===PAGE id=operasyon-api-key-olusturma title=API key oluşturma pos=3===
# API key oluşturma

Machine-to-machine kimlik doğrulama.

## Türler

- **Tenant-wide:** Tüm tenant erişimi
- **Scoped:** Belirli kaynak (örn. sadece read employee)
- **IP-restricted:** Sadece belirli IP'den
- **Expiring:** 7 / 30 / 90 / 365 gün

## Oluşturma

**Admin > Operasyon > API keys > + Yeni**

1. Ad + amaç açıklama
2. Scope seçimi (permission)
3. IP allowlist (opsiyonel)
4. Son geçerlilik tarih
5. Submit → **key bir kez gösterilir** (sonra sadece hash görünür)

## Kullanım

```bash
curl -H "Authorization: Bearer upc_sk_abc123..." \
     https://api.upcore.io/api/v1/employees
```

## Güvenlik

- **Asla public repo'ya koymayın** (pre-commit hook öneri)
- `.env` dosyası + git ignore
- CI/CD secret manager
- Secret rotation 90 günde 1

## İptal

- Self-servis iptal
- Anlık etkili
- Audit log

## Sızıntı

Sızan key:
1. Admin paneli derhal iptal
2. Yeni key oluştur
3. Audit log incele (ne kullanıldı?)
4. KVKK bildirim (kişisel veri çalındıysa)

===PAGE id=operasyon-impersonation title=Impersonation (vekaletsiz giriş) pos=4===
# Impersonation (vekaleten giriş)

Destek çalışanının müşteri hesabına geçici erişim.

## Ne zaman kullanılır?

- Destek ticketı çözümü
- Bug reproduction
- Demo (consentli)

## Akış

1. Admin talebi — gerekçe zorunlu
2. Müşteri (tenant admin) **onay** (e-posta ile)
3. Onay alındıktan sonra 1 saat geçerli session
4. Her aksiyon audit log'a "impersonated by X" notu ile
5. Session kapanır → session geçmişi müşteri ile paylaşılır

## Sınırlar

Impersonation sırasında **yapılamayanlar**:
- Şifre değiştirme
- MFA kurulumu
- Hassas veri indirme (maaş, TCKN)
- Yeni admin atama
- Feature flag değişimi (üretim)

## Çalışana bildirim

Impersonation başladığında + bittiğinde:
- Etkilenen çalışana anında e-posta
- Dashboard'da notification banner
- Ek açıklama: "UpCore destek ekibi hesabınıza teknik sebeple erişti"

## Audit

- Tüm impersonation WORM audit log'a
- Aylık rapor müşteriye
- Olağandışı kullanım (>5 kez/ay) → müşteri güvenlik alarmı

===PAGE id=operasyon-bulk-export title=Bulk export pos=5===
# Bulk export

Büyük veri setlerinin toplu dışa aktarımı.

## Export türleri

- **Tam snapshot:** Tüm tenant verileri (backup amaçlı)
- **Kategori:** Sadece çalışanlar / pulse / bordro
- **Tarih aralıklı:** Belirli dönem
- **Özel filtre:** Custom SQL-like

## Format

- CSV (Excel uyumlu)
- JSON (developer)
- Parquet (data engineer)
- Excel (XLSX) — çoklu sayfa

## Async akış

Büyük export (>100 MB) async:
1. Request → Job ID
2. Durum kontrol endpoint
3. Tamamlanınca S3-compatible link
4. 7 gün geçerli

## KVKK

Export işlemi öncesi:
- Gerekçe zorunlu (dropdown + serbest)
- Onay akışı (>1 GB için İK + DPO)
- Audit log
- Kişisel veri masking opsiyonu

## Lite export

Küçük veri (<10 MB) sync direkt CSV response.

===PAGE id=operasyon-audit-log-izleme title=Audit log izleme pos=6===
# Audit log izleme

Sistemdeki her önemli aksiyonun kaydı.

## Neler kaydedilir?

- Login / logout (başarılı ve başarısız)
- Veri erişim (kim neyi ne zaman okudu)
- Veri değiştirme (eski değer + yeni değer)
- Permission değişim
- Export / import
- API key oluşturma / kullanma
- Impersonation
- Webhook tetiklemeleri
- Cron job başlatma / tamamlama

## WORM kuralı

**Write Once Read Many** — audit log:
- Yazılır ama değiştirilemez
- Silinemez
- 7 yıl saklanır (Enterprise: 10 yıl)
- Dijital imzalı

## Arama

**Admin > Audit log > Arama**

Filtreler:
- Tarih aralığı
- Kullanıcı
- Aksiyon türü
- Kaynak ID
- IP address
- Başarılı / başarısız

## Anomali tespiti

UpCore otomatik:
- Olağandışı login (ülke, saat, cihaz)
- Büyük veri erişim patern'i
- Hakkaniyetsiz bulk operasyon
- Rate limit patlak

## SIEM entegrasyon

Enterprise: SIEM'e stream export
- Splunk
- Elastic Stack
- Azure Sentinel
- AWS CloudWatch

## Rapor

- Haftalık otomatik e-posta (admin)
- Aylık risk raporu
- Yıllık compliance rapor

===PAGE id=uyum-soc2-readiness title=SOC 2 Type II readiness pos=1===
# SOC 2 Type II readiness

Müşteri due diligence için önemli.

## SOC 2 Type II nedir?

AICPA (American Institute of CPAs) tarafından geliştirilmiş, bulut servislerinin güvenlik kontrollerini değerlendiren bir audit standardı.

## 5 Trust Service Criteria

1. **Security** — erişim kontrolü, sistem koruması
2. **Availability** — uptime, kapasite
3. **Processing integrity** — doğru + tam + zamanında
4. **Confidentiality** — gizlilik
5. **Privacy** — kişisel veri koruma

UpCore: 1, 2, 5 üzerinde çalışıyor.

## UpCore SOC 2 durumu 2026

- **Type I (snapshot):** Tamamlandı (Aralık 2025)
- **Type II (6+ ay gözlem):** Devam ediyor (Eylül 2026 hedef)
- Denetim firma: Ernst & Young (EY)

## Rapor erişimi

- Enterprise müşteriler: NDA altında paylaşılır
- İstek: `compliance@upcore.io`
- Section III (vendor management) özellikle paylaşılır

## Müşteri hazırlığı

UpCore SOC 2 raporu size:
- Kendi SOC 2'niz için vendor kanıtı
- Bank / kamu tender için due diligence
- Güvenlik politika referans

## Kontrol haritası

UpCore kontrolleri → SOC 2 kriterlerine:
- Encryption at rest → CC6.1, CC6.7
- MFA → CC6.1
- Backup + DR → A1.2, A1.3
- Change management → CC8.1
- Incident response → CC7.3

Tam matris: Enterprise NDA sonrası.

===PAGE id=uyum-dpa-sablon title=DPA (Data Processing Agreement) şablonu pos=2===
# DPA (Data Processing Agreement) şablonu

KVKK Madde 12 + GDPR Madde 28 uyumlu alt işleyici sözleşmesi.

## İçindekiler

1. Taraflar + tanımlar
2. Sözleşme konusu ve amaç
3. İşleme türleri + veri kategorileri
4. Süreler + saklama
5. Alt işleyiciler (UpCore varolan listesi)
6. Veri sahibi hakları (UpCore'un desteği)
7. Güvenlik tedbirleri (Annex II)
8. İhlal bildirim (72 saat SLA)
9. Denetim hakları (yılda 1 kez)
10. Feshi + veri iadesi / silme
11. Hukuk + uyuşmazlık

## UpCore standart DPA

[PDF indir](https://docs.upcore.io/downloads/dpa-template-2026-tr.pdf)
[English version](https://docs.upcore.io/downloads/dpa-template-2026-en.pdf)

## Negotiation

Enterprise müşteri için customize edilebilir:
- Kendi güvenlik gereksinimleri (Annex II ekleri)
- Özel audit kapsamı
- İhlal bildirim süresi (72s → 24s müzakere edilebilir)
- Liability cap (hukuki sınır)

## İmzalama

- Dijital imza (KEP veya e-imza)
- Karşılıklı imza
- Saklama: KVKK md. 12 gereği dosyalama

## Alt işleyici değişiklik

UpCore yeni alt işleyici ekleyince:
- 30 gün önceden müşteri bilgilendirme
- Müşteri itiraz etme hakkı (reasonable grounds)
- İtiraz kabul edilmezse müşteri sözleşme fesih

===PAGE id=uyum-veri-ikametgahi title=Veri ikametgahi pos=3===
# Veri ikametgahi (data residency)

Verilerin hangi coğrafyada saklandığı.

## Varsayılan konum

- **Birincil:** Azure Türkiye İstanbul bölgesi (2023'ten beri mevcut)
- **Yedek (DR):** Azure Frankfurt (Avrupa)
- **CDN edge:** global (public assets, hiç kişisel veri değil)

## Seçenekler

### Starter / Growth
- Sabit: Türkiye + Avrupa (DR)

### Enterprise
- **Türkiye-only** (DR dahil Türkiye içi) — ek ücret
- **Avrupa-only** (AB müşterileri)
- Hybrid: primary Türkiye, DR başka ülke

### Enterprise Plus
- Single-tenant subscription (tam izolasyon)
- Dedicated Azure account
- Customer-managed keys (bring your own key)

## Compliance çerçeve

- **KVKK:** Türkiye içi en iyisi
- **GDPR:** Avrupa + yeterlilik kararı olan ülkeler
- **HIPAA:** Şu an destekliyor değil (sağlık sektörü özel)

## Alt işleyici lokasyonları

UpCore alt işleyicilerinden:
- **Primary veriler:** Türkiye / Avrupa
- **SendGrid (e-posta gönderim):** ABD — SCC ile
- **Algolia (arama):** Fransa — GDPR uyumlu
- **LLM (AI, opt-in):** ABD — Data Privacy Framework

LLM entegrasyonu varsayılan **kapalı** — açık rıza ile açılır.

===PAGE id=uyum-log-retansiyon title=Log retansiyon pos=4===
# Log retansiyon

Audit log + sistem log saklama süreleri.

## Log kategorileri

| Tür | Retention | Mevzuat |
|---|---|---|
| Audit log (WORM) | 7 yıl (Enterprise 10) | KVKK md. 12 |
| Login log | 3 yıl | SOC 2 |
| API access log | 1 yıl | Genel güvenlik |
| Error log | 6 ay | Debug |
| Performance metrics | 1 yıl | Kapasite planning |
| Webhook delivery log | 30 gün | Operasyon |

## Arşivleme stratejisi

- **Hot (son 30 gün):** Fast query, dashboard
- **Warm (30 gün - 1 yıl):** Normal query, slower
- **Cold (1 yıl+):** S3 Glacier, retrieve saat sürer
- **Frozen (7 yıl+):** Tape / glacier deep archive

## Export formatlar

- JSON (structured)
- CSV (reporting)
- Parquet (analytics)
- Encrypted zip (archive)

## KVKK uyumluluğu

- PII içeren log: pseudonymize (7 yıl sonra anonim)
- Çalışan veri indirme talebinde log dahil edilir (Madde 11/a)
- Silme talebinde log **silinmez** (yasal saklama gerekçesi) ama maskelenir

## Storage maliyet

- Hot: 1 TB = ~5 000 TRY/ay
- Warm: 1 TB = ~1 500 TRY/ay
- Cold: 1 TB = ~250 TRY/ay

Enterprise müşteriye büyük log sık ise warehouse export önerilir.

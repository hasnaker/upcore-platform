# Clerk Auth Kurulum Rehberi

> **Amaç:** UpCore'un auth altyapısı Clerk üzerinde çalışır. Bu dokümanı izleyerek Clerk Dashboard tarafını tamamen kur — kod tarafı hazır, sadece Clerk'in konfigürasyonu gerekiyor.

---

## 1. Uygulama Oluştur

1. https://dashboard.clerk.com → **Add application**
2. Adı: `UpCore` (prod için `UpCore Production`, dev için `UpCore Dev`)
3. Oturum açma yöntemleri: **Email** + **Password** (zorunlu) + opsiyonel **Google OAuth**
4. Lokalizasyon: **Turkish**

---

## 2. API Keys

**Dashboard → API Keys** sekmesi:
- **Publishable key** (`pk_test_...` veya `pk_live_...`) → `.env` içine `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Secret key** (`sk_test_...` veya `sk_live_...`) → `.env` içine `CLERK_SECRET_KEY`

**Frontend API** bölümündeki URL → `.env` içine `CLERK_ISSUER`
Örnek: `https://clerk.upcore.app` veya `https://awesome-dog-42.clerk.accounts.dev`

**JWKS URL** (genellikle `Issuer + /.well-known/jwks.json`) → `.env` içine `CLERK_JWKS_URL`

---

## 3. Organizations — Multi-Tenancy Omurgası

**Dashboard → Organizations** → **Enable organizations**

Her UpCore müşterisi = 1 Clerk Organization.

**Organizations → Default role:** `member`
**Organizations → Custom roles (önerilen):**
- `owner` — şirket sahibi / CEO / tek admin
- `hr_admin` — İK direktörü / İK daire başkanı
- `hr_manager` — İK uzmanı
- `manager` — departman yöneticisi
- `employee` — çalışan (standart)

---

## 4. JWT Template — ÇOK ÖNEMLİ

Backend (`api-gateway`, `auth`) JWT'den `tenant_id`, `roles`, `email` claim'lerini okur. Default Clerk token'ı bunu içermez — custom JWT template gerekli.

**Dashboard → JWT Templates → New template:**

**Name:** `upcore`
**Token lifetime:** `3600` (1 saat)
**Allowed clock skew:** `5` (saniye)

**Claims (JSON):**

```json
{
  "tenant_id": "{{org.public_metadata.tenant_id}}",
  "org_id": "{{org.id}}",
  "roles": "{{org.public_metadata.roles}}",
  "org_role": "{{org_membership.role}}",
  "email": "{{user.primary_email_address}}",
  "aud": "upcore-api"
}
```

**Not:** `upcore-api` audience değeri `.env`'deki `JWT_AUDIENCE` ile birebir eşleşmeli.

### Frontend'te bu template'i kullan

`apps/web/src/hooks/useApi.ts` içindeki `getToken()` çağrısı:
```ts
const token = await getToken({ template: 'upcore' });
```

> **Dikkat:** Default `getToken()` session JWT'si döner, template=upcore olmadan `tenant_id` claim'i yoktur ve gateway `403 forbidden` döner.

---

## 5. Organization Public Metadata

Her yeni tenant (organization) oluşturulduğunda `public_metadata`'ya şu alanlar **zorunlu** olarak yazılmalı:

```json
{
  "tenant_id": "f7c8a9d3-...-...",   // UpCore DB'deki tenants.id UUID'si
  "roles": ["hr_admin"],              // default roles for new members
  "plan": "enterprise",               // başlangıç/profesyonel/enterprise
  "locale": "tr-TR"
}
```

**Yazma yöntemleri:**
1. **Admin paneli** (apps/admin — Faz 8): tenant oluştur endpoint'i hem DB'de hem Clerk'te yazar.
2. **Manuel (ilk onboarding):** Clerk Dashboard → Organization → Metadata → JSON düzenle.
3. **Backend API:** `POST /api/v1/tenants` endpoint'i Clerk SDK ile organization yaratır + `public_metadata` set eder.

---

## 6. Webhooks

**Dashboard → Webhooks → Add endpoint:**

**Endpoint URL:**
- Prod: `https://api.upcore.app/webhooks/clerk`
- Lokal: `ngrok http 8001` veya `cloudflared tunnel --url http://localhost:8001` ile tünel aç, URL'i buraya koy.

**Events (subscribe):**
- `user.created`
- `user.updated`
- `user.deleted`
- `organization.created`
- `organization.updated`
- `organizationMembership.created`
- `organizationMembership.updated`
- `organizationMembership.deleted`
- `session.created` (opsiyonel — audit)
- `session.ended`
- `session.revoked`

**Signing Secret** (`whsec_...`) → `.env` içine `CLERK_WEBHOOK_SECRET`

---

## 7. URL'ler (Clerk Dashboard → Paths)

| Ayar | Değer |
|---|---|
| Sign-in URL | `/giris` |
| Sign-up URL | `/kayit` |
| After sign-in URL | `/panel` |
| After sign-up URL | `/onboarding` |
| User profile URL | `/ayarlar/profil` |
| Organization profile URL | `/ayarlar/organizasyon` |
| Create organization URL | `/onboarding/yeni-organizasyon` |

---

## 8. Frontend Env Kontrolü

`apps/web/.env.local` içinde şunlar dolu olmalı:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/giris
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/kayit
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/panel
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
```

---

## 9. Smoke Test

```bash
# 1. Altyapıyı ayağa kaldır
docker compose -f infrastructure/docker-compose.yml up -d postgres redis
docker compose -f infrastructure/docker-compose.yml up -d auth api-gateway

# 2. Frontend başlat
cd apps/web && pnpm dev

# 3. Tarayıcıdan http://localhost:3000/kayit — yeni kullanıcı oluştur
# 4. /panel'e yönlendirme olmalı
# 5. Kullanıcı adı header'da görünmeli
# 6. Terminal'den doğrula:
curl -H "Authorization: Bearer <clerk-jwt>" http://localhost:8080/api/v1/auth/me
# → 200 OK, kullanıcı profili JSON
```

---

## 10. Sorun Giderme

| Belirti | Sebep | Çözüm |
|---|---|---|
| Gateway 401 invalid_token | `CLERK_ISSUER` / `CLERK_JWKS_URL` yanlış | Dashboard'dan tam URL'i kopyala, `.env`'i güncelle, servisi restart et |
| Gateway 403 forbidden (tenant context required) | JWT template'inde `tenant_id` yok | "upcore" template claims'i kontrol et, `org.public_metadata.tenant_id` olmalı ve org seçili olmalı |
| Webhook 401 invalid signature | Svix secret yanlış | Dashboard'dan endpoint signing secret'ı kopyala, `CLERK_WEBHOOK_SECRET`'e yaz |
| Webhook çalışmıyor (lokal) | Localhost'a Clerk ulaşamaz | ngrok/cloudflared tunnel kullan |
| User oluştu ama DB'de yok | Webhook dispatcher tenant_id çıkaramadı | `public_metadata.tenant_id` eksik, önce organization seçtir |

---

## 11. Production Check-list

- [ ] Prod uygulaması ayrı Clerk app (dev/prod ayrı keys)
- [ ] `CLERK_ISSUER` prod için özel domain (`clerk.upcore.app` — DNS CNAME)
- [ ] Webhook endpoint HTTPS + Azure Front Door IP whitelist (Clerk public IP'leri)
- [ ] JWT template TTL prod için `3600` (1s), dev için `86400` (24s OK)
- [ ] Rate limit: Clerk Dashboard → Security → Attack protection aktif
- [ ] MFA zorunlu (hr_admin ve üstü için)
- [ ] Session timeout: 8 saat aktif kullanım sonrası
- [ ] Email domain restrictions (opsiyonel — kurumsal müşteriler için @company.com)

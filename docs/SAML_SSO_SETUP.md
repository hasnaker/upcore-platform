# SAML SSO Setup — Azure AD + Google Workspace

UpCore uses **Clerk** as the identity layer. Enterprise customers can connect
their IdP via SAML 2.0; no code changes are needed — Clerk handles the
assertion flow, then emits the standard `session.created` event that UpCore's
gateway middleware already consumes.

This document is the **admin runbook** per tenant.

---

## 1. Prerequisites

- Clerk production instance is in **Enterprise** plan (required for SAML)
- Tenant has a verified domain (e.g. `acme.com`)
- Tenant admin has access to their IdP console (Azure AD / Google Admin)

---

## 2. Azure AD (Entra ID) flow

### In Azure

1. Azure Portal → **Enterprise applications** → **+ New application** → **Create your own application**
2. Name: `UpCore HR` → Integrate any other application you don't find
3. **Single sign-on** → **SAML**
4. Basic SAML Configuration — fill from Clerk dashboard:
   - Identifier (Entity ID): `https://clerk.upcore.app/v1/saml/{connection_id}`
   - Reply URL (ACS URL): `https://clerk.upcore.app/v1/saml/{connection_id}/acs`
5. User Attributes & Claims — map:
   - `email` → `user.mail`
   - `firstName` → `user.givenname`
   - `lastName` → `user.surname`
   - `groups` (optional) → `user.groups` for role mapping
6. SAML Signing Certificate → download **Base64** cert
7. Users and groups → assign the groups you want logged in

### In Clerk (UpCore admin does this)

1. Clerk dashboard → **User & Authentication** → **Enterprise connections**
2. **+ Add connection** → SAML
3. Name: `Acme Azure AD`
4. Upload the Base64 cert
5. Set Entity ID + SSO URL (from Azure SAML page)
6. **Domain**: add `acme.com` — Clerk only triggers SAML for this email domain
7. Attribute mapping — keep defaults (email/firstName/lastName)
8. Save + copy the **Connection ID** back into Azure if you used placeholder URLs

Test: logout → open `app.upcore.app` → enter `someone@acme.com` → should auto-redirect to Azure login → back to UpCore.

---

## 3. Google Workspace flow

### In Google Admin

1. `admin.google.com` → **Apps** → **Web and mobile apps** → **Add custom SAML app**
2. App name: `UpCore HR`
3. Download the metadata XML (or copy SSO URL + cert)
4. **Service provider details**:
   - ACS URL: `https://clerk.upcore.app/v1/saml/{connection_id}/acs`
   - Entity ID: `https://clerk.upcore.app/v1/saml/{connection_id}`
   - Name ID format: EMAIL
5. **Attribute mapping**:
   - `First name` → firstName
   - `Last name` → lastName
   - `Primary email` → email

### In Clerk

Same as Azure flow — upload metadata XML instead of cert (Clerk parses it).

---

## 4. Role mapping (optional but recommended)

Clerk attribute mapping can set Clerk **public metadata** from SAML attributes.

Add to your Clerk SAML connection:

| Attribute          | Clerk field             |
|--------------------|-------------------------|
| `groups`           | `public_metadata.role`  |

Then in UpCore employee service `middleware/auth.go`, `RoleFromContext()` uses
the Clerk `public_metadata.role` field (or the `X-User-Role` header set by
gateway JWT verification).

**Suggested IdP group → UpCore role map:**

| IdP group          | UpCore role     |
|--------------------|-----------------|
| `upcore-admins`    | `admin`         |
| `upcore-hr`        | `hr_admin`      |
| `upcore-payroll`   | `payroll_admin` |
| `upcore-managers`  | `manager`       |
| (default)          | `employee`      |

---

## 5. Testing checklist

- [ ] `/giris` page shows SSO redirect for `@acme.com` emails
- [ ] New user logs in → row appears in `auth.users` with tenant linked
- [ ] Manager-scoped filter works (visible Çalışanlar list only for their team)
- [ ] Employee-role user can only see `/portal/*`
- [ ] `X-User-Role` header is set by gateway on every request

---

## 6. SCIM provisioning (optional)

Clerk Enterprise supports SCIM 2.0 for auto-provisioning / de-provisioning
from Azure AD. Turning this on is idempotent; existing users don't lose their
UpCore employee mappings.

Details: https://clerk.com/docs/authentication/enterprise-connections/scim

---

## 7. Break-glass account

Always keep **one local Clerk admin** with a non-corporate email as backup —
SAML misconfigurations can lock out an entire tenant otherwise. Document the
credentials in your password manager.

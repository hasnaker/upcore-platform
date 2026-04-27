---
id: sso-oidc
title: "SSO — OIDC (OpenID Connect) kurulum"
sidebar_position: 2
---

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

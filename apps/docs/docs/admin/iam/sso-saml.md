---
id: sso-saml
title: "SSO — SAML kurulum"
sidebar_position: 1
---

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

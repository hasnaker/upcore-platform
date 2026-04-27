---
id: scim-kullanici-senkron
title: "SCIM kullanıcı senkron"
sidebar_position: 3
---

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

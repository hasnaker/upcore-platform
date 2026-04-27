---
id: giris
title: Admin rehberine hoş geldiniz
slug: /admin/giris
sidebar_position: 1
---

# Admin rehberine hoş geldiniz

Admin rehberi platform operatörü, CTO, IT yöneticisi veya sistem integrasyonu yapan ekipler için.

## Başlangıç sırası

1. [Yeni tenant oluşturma](./tenant/yeni-tenant-olusturma)
2. [Onboarding wizard](./tenant/onboarding-wizard)
3. [SSO (SAML/OIDC) kurulum](./iam/sso-saml)
4. [SCIM kullanıcı senkron](./iam/scim-kullanici-senkron)
5. [Feature flag yönetimi](./operasyon/feature-flag)

## Admin modülleri

- **Tenant kurulumu** — yeni şirket ekleme, onboarding sihirbazı
- **Kimlik ve erişim (IAM)** — SSO, SCIM, RBAC, MFA
- **Billing** — abonelik, fatura, kullanım metrikleri
- **Operasyon** — feature flag, webhook, API key, bulk export
- **Uyum** — SOC 2 readiness, veri ikametgahi, log retansiyon

## Güvenlik ilkesi

- **Principle of least privilege:** Admin rolleri minimum
- **MFA zorunlu:** Tüm admin hesapları için
- **Impersonation audit:** Her admin impersonation kaydedilir + bildirim çalışana
- **Audit log:** WORM, 7 yıl
- **Separation of duties:** Billing admin ≠ İK admin ≠ security admin

---
id: rbac-rol-yonetimi
title: "RBAC rol yönetimi"
sidebar_position: 4
---

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

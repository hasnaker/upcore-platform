---
id: yeni-tenant-olusturma
title: "Yeni tenant oluşturma"
sidebar_position: 1
---

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
4. İlk kurulum 15-30 dk ([Onboarding wizard](./onboarding-wizard))

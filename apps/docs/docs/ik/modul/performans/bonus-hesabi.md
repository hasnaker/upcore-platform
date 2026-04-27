---
id: bonus-hesabi
title: "Bonus hesabı"
sidebar_position: 9
---

# Bonus hesabı

Performans-linked bonus hesaplama motoru.

## Bonus türleri

| Tip | Hesap | Ne zaman |
|---|---|---|
| Yıllık performans bonus | Maaş × performans çarpanı | Yıl sonu |
| Quarterly spot bonus | Sabit tutar | Çeyrek sonu |
| Satış komisyonu | Revenue × yüzde | Aylık |
| Referral bonus | Yeni çalışan işe alınınca | Tek seferlik |
| Proje başarı bonusu | Bütçe → hedef altı | Proje sonu |

## Performans çarpanı modeli

Varsayılan model:
- Skor 1.0–2.0 → %0 bonus
- Skor 2.0–3.0 → %25 × hedef bonus
- Skor 3.0–4.0 → %75 × hedef bonus
- Skor 4.0–5.0 → %100 × hedef bonus
- Exceptional (sadece %5 çalışan) → %125 × hedef bonus

Hedef bonus = Aylık brüt maaş × (1–4) ay bonus katsayısı (şirket politikası).

## OKR entegrasyon

OKR skoru bonus çarpanına dahil edilebilir:
- Sadece performans skoru (default)
- Performans %70 + OKR %30 (hibrit)
- Sadece OKR (KR tamamlanma) — risk: Goodhart yasası

:::warning
%100 OKR → bonus modeli Goodhart yasası riskini artırır. Çalışanlar kolay hedefleri seçmeye yönlendirilir.
:::

## Bias denetimi

Otomatik:
- Cinsiyet × ortalama bonus
- Yaş × ortalama bonus
- Departman × ortalama bonus

%10+ fark varsa uyarı — yönetim kuruluna rapor.

## Hesap formülü (şirket özel)

UpCore'da drag-and-drop formül editörü ile hesap:

    bonus = base_salary
            * performance_multiplier
            * company_performance_factor
            * tenure_factor

Her faktör tenant-bazlı ayarlanabilir.

## Bonus onayı

- Yönetici öneri yapar
- Bir üst yönetici onaylar
- CHRO global onay
- Finance final onay (bütçe limiti)

Audit log her adımı kayıt altına alır.

## Ödeme

Bordro sistemi ile entegrasyon:
- Hesaplanan bonus → bordro içinde "ek gelir" kalemi
- Gelir vergisi + SGK prim otomatik kesinti
- Çalışanın bordrosunda ayrı satır olarak görünür

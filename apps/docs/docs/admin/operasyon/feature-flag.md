---
id: feature-flag
title: "Feature flag yönetimi"
sidebar_position: 1
---

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

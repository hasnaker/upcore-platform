---
id: veri-ikametgahi
title: "Veri ikametgahi"
sidebar_position: 3
---

# Veri ikametgahi (data residency)

Verilerin hangi coğrafyada saklandığı.

## Varsayılan konum

- **Birincil:** Azure Türkiye İstanbul bölgesi (2023'ten beri mevcut)
- **Yedek (DR):** Azure Frankfurt (Avrupa)
- **CDN edge:** global (public assets, hiç kişisel veri değil)

## Seçenekler

### Starter / Growth
- Sabit: Türkiye + Avrupa (DR)

### Enterprise
- **Türkiye-only** (DR dahil Türkiye içi) — ek ücret
- **Avrupa-only** (AB müşterileri)
- Hybrid: primary Türkiye, DR başka ülke

### Enterprise Plus
- Single-tenant subscription (tam izolasyon)
- Dedicated Azure account
- Customer-managed keys (bring your own key)

## Compliance çerçeve

- **KVKK:** Türkiye içi en iyisi
- **GDPR:** Avrupa + yeterlilik kararı olan ülkeler
- **HIPAA:** Şu an destekliyor değil (sağlık sektörü özel)

## Alt işleyici lokasyonları

UpCore alt işleyicilerinden:
- **Primary veriler:** Türkiye / Avrupa
- **SendGrid (e-posta gönderim):** ABD — SCC ile
- **Algolia (arama):** Fransa — GDPR uyumlu
- **LLM (AI, opt-in):** ABD — Data Privacy Framework

LLM entegrasyonu varsayılan **kapalı** — açık rıza ile açılır.

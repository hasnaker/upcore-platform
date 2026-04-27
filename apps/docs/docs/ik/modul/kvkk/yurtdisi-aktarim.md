---
id: yurtdisi-aktarim
title: "Yurt dışı aktarım"
sidebar_position: 9
---

# Yurt dışı aktarım

KVKK Madde 9 — kişisel verinin yurt dışına aktarımı.

## Hukuki temel

Aktarım yapılabilir eğer:
1. **Açık rıza** (md. 5/1)
2. **Yeterlilik kararı** alınmış ülke (KVK Kurulu listesi)
3. **Yeterli önlemler** (BCR, standart sözleşme maddeleri)
4. **İstisna** (md. 9/2 — sınırlı durumlar: hayat kurtarma, önemli kamu menfaati)

## Yeterlilik kararı olan ülkeler (Şubat 2026)

- AB üyeleri (bazı koşullarla, KVK Kurulu son güncellemeye bakın)
- İngiltere (post-Brexit)
- ABD — **Data Privacy Framework** katılımcı şirketler (yeni framework)
- Yeni Zelanda, Japonya, Güney Kore, İsrail, Arjantin (tartışma halinde)

## Önemli: Türkiye'den çıkmayan veri tercihi

UpCore tüm verileri **Türkiye'de** (Azure West Europe - İrlanda, Avrupa bölgesi opt-in) saklar. AWS / GCP kullanılmaz.

## Standart sözleşme maddeleri (SCC)

- AB SCC (2021+) — AB modeline benzer Türkiye versiyonu yok (henüz)
- KVK Kurulu standart sözleşme taslakları (2023 güncel)
- Transfer impact assessment (TIA) önerilen

## UpCore alt işleyici listesi

Veri işleme sürecinde UpCore kullandığı 3. taraflar:

| Alt işleyici | Amaç | Lokasyon | Yasal temel |
|---|---|---|---|
| Microsoft Azure (primary) | Altyapı | Türkiye İstanbul | Türkiye içi |
| Microsoft Azure (DR) | Yedek | Frankfurt / İrlanda | SCC + GDPR uyumlu |
| SendGrid | E-posta | ABD | DPF katılımcı |
| Twilio | SMS | ABD | DPF katılımcı |
| Algolia | Arama | Fransa | GDPR |
| Anthropic | LLM (opsiyonel) | ABD | DPA + SCC |
| OpenAI | LLM (opsiyonel) | ABD | DPA + SCC |

**Not:** LLM entegrasyonları **opt-out** varsayılandır. Tenant açtığında kişisel veri gönderilmez (agrega analizi local).

## DPA (Data Processing Agreement)

UpCore müşterileri için standart DPA:
- KVKK Madde 12 + GDPR Madde 28 uyumlu
- Alt işleyici listesi + güncelleme politikası
- Güvenlik tedbirleri (Annex II)
- Denetim hakları

DPA otomatik PDF indirme: [DPA şablonu](/docs/admin/uyum/dpa-sablon).

## Müşteri veri sovereignty

Enterprise müşteriler:
- **Data residency:** Sadece Türkiye (cost 10-20% higher)
- **Customer-managed keys:** Kendi anahtarınızı kullanın
- **Single-tenant deployment:** Ayrı Azure subscription

## Denetim

Yurt dışı aktarım için:
- Yıllık transfer report
- Alt işleyici değişiklik bildirimi
- VERBIS'te güncel beyan
- Müşteri DPO'ya erişim

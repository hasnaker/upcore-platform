---
id: plan-secimi
title: "Plan seçimi"
sidebar_position: 1
---

# Plan seçimi

UpCore planlar 2026.

## Plan matrisi

| Özellik | Starter | Growth | Enterprise | Enterprise Plus |
|---|---|---|---|---|
| Aylık fiyat (çalışan başı) | 49 TL | 79 TL | 129 TL | Özel |
| Min çalışan | 50 | 100 | 200 | 1000 |
| Max çalışan | 500 | 2000 | 10 000 | Sınırsız |
| Modüller | Sürdürme, İK Ops | + Performans, Koruma | Hepsi | Hepsi + custom |
| API call limit | 10 000/ay | 100 000/ay | 1M/ay | 10M/ay |
| Veri retention | 3 yıl | 5 yıl | 7 yıl | Özel |
| SSO | — | SAML 1 tane | SAML 3 tane + OIDC | Sınırsız |
| SCIM | — | — | ✓ | ✓ |
| SLA | 99% | 99.5% | 99.9% | 99.99% |
| Destek | E-posta 48s | E-posta 24s + chat | Dedicated CSM + 4s | 24/7 + 1s |
| Audit log retention | 1 yıl | 3 yıl | 7 yıl | Custom |

## Upgrade akışı

1. **Billing > Plan değiştir**
2. Yeni plan seç
3. Prorate hesap (varolan dönemin kalan kısmı)
4. Ödeme
5. Anında aktifleştirme

## Downgrade

- Dönem sonu etkili (proration yok)
- Veri ayarları: veri kapasite sınırı uygulanır
- Bazı özellikler read-only olur (eski veri kaybolmaz)

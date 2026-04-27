---
id: genel-bakis
title: Koruma modülü — genel bakış
sidebar_position: 1
---

# Koruma modülü — genel bakış

Koruma, Sürdürme modülünün ürettiği erken uyarı sinyallerine **evidence-based müdahaleyle** cevap veren modüldür.

## Felsefe

"İyi İK verisi toplamak yeterli değildir — eylemde bulunmak gerekir." Koruma modülü, aksiyonu bilimsel temele oturtur:

- **Müdahale katalogu:** 20+ evidence-based müdahale (her biri akademik kaynağa bağlanmış)
- **Thompson sampling:** Hangi müdahale bu çalışana / bu bağlamda en çok işe yarar?
- **Consent akışı:** KVKK uyumlu açık rıza
- **Etki ölçümü:** Cohen's d ile pre/post karşılaştırma

## Temel iş akışı

```
Sinyal → Öneri → Consent → Plan → Uygulama → İzleme → Etki → Öğren
```

## Modül bileşenleri

| Bileşen | Amaç |
|---|---|
| [Müdahale kataloğu](./mudahale-katalogu) | 20+ müdahale, A/B/C kanıt seviyesi |
| [Thompson sampling öneri](./thompson-sampling) | Multi-armed bandit öneri motoru |
| [Consent akışı](./consent-akisi) | KVKK uyumlu rıza |
| [Plan takibi](./plan-takibi) | Müdahale yaşam döngüsü |
| [Etki ölçümü](./etki-olcumu) | Cohen's d hesabı |
| [Cohen's d yorumu](./cohens-d-yorumu) | Etki büyüklüğü bilim |
| [Referral network](./referral-network) | Anonim psikolog/koç ağı |
| [İzleme takvimi](./izleme-takvimi) | 4/8/12 hafta check-in |

## Başarı kriterleri

- Kırmızı band'a düşen çalışanların %80+'ı için consent + plan oluşturulmuş
- Ortalama Cohen's d ≥ 0.4 (klinik anlamlı)
- %65+ çalışan memnuniyeti (müdahale sonrası anket)
- < %5 müdahale drop-out oranı

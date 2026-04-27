---
id: anket-guvenilirligi
title: Anket güvenilirliği
sidebar_position: 3
---

# Anket güvenilirliği

Pulse anketinin sonuçlarına güvenebilmek için bilinmesi gereken istatistiksel ve metodolojik kavramlar.

## Katılım oranı

| Oran | Yorum | Eylem |
|---|---|---|
| ≥%80 | Mükemmel | Sonuçları kullan |
| %60–80 | İyi | Kullanılabilir, yorumlarda temkinli ol |
| %40–60 | Orta | Sonuçları İK-içi konuş, paylaşma |
| < %40 | Zayıf | Kitle yanlı, rapor üretme — katılım kampanyası yap |

## Ölçek güvenilirliği

**Cronbach's α** — iç tutarlılık:
- α ≥ 0.80 → güçlü
- α ≥ 0.70 → kabul edilebilir
- α < 0.70 → şüpheli, madde analizi yap

UpCore'un hazır şablonları:
- BAT-12-TR: α = 0.87 (Koçak 2022)
- UWES-9: α = 0.92 (Schaufeli 2006 orijinali)
- COPSOQ-III-TR: α = 0.83 ortalaması (Şahan 2019)

## Test-retest güvenilirliği

Aynı maddeyi aynı kişiye farklı zamanda verince korelasyon olmalıdır:
- r ≥ 0.70 → iyi
- 2 haftadan kısa süre: **yorgunluk etkisi** ile düşer — soru rotasyonu şart

## Geçerlilik çeşitleri

| Türü | Anlam | UpCore'da nasıl |
|---|---|---|
| İçerik geçerliliği | Soru kavramı kapsıyor mu? | Akademik ölçeklerin kullanımı |
| Yapı geçerliliği | CFA (confirmatory factor analysis) | Türkiye normları |
| Ölçüt geçerliliği | Dış değişken ile korelasyon | İşten ayrılma ile r=0.45 (BAT-TR) |

## Yaygın hatalar

1. **Özel soru eklerken ölçek kirliliği** — "bugün motivasyonum" gibi anlık soru BAT-TR agregasını bozar. Özel sorular **ayrı başlıkta** toplanır.
2. **Küçük örneklem** — n < 30 için normal dağılım varsayımı bozulur. Alt grup istatistiği için median + IQR kullan.
3. **Çoklu test düzeltmesi** — 20 departman × 12 madde = 240 karşılaştırma. Bonferroni uygula (α = 0.05 / 240).

## Bias kaynakları

- **Sosyal arzu edilirlik:** "olması gereken" cevabı verme. Anonim tasarım + aydınlatma ile azaltılır.
- **Acquiescence bias:** Yes-saying eğilimi. Negatif yüklü maddeler karıştır.
- **Halo etkisi:** Son 24 saat olayının tüm cevapları şekillendirmesi. Gönderim zamanını olaylardan bağımsız sabitle.

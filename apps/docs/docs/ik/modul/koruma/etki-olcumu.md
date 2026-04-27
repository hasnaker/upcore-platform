---
id: etki-olcumu
title: Etki ölçümü
sidebar_position: 6
---

# Etki ölçümü

Müdahalenin işe yarayıp yaramadığını **bilimsel olarak** nasıl ölçeriz?

## Pre/post karşılaştırma

- **T0 (baseline):** Consent anında BAT-TR skoru
- **T1 (mid):** 4. hafta skoru
- **T2 (end):** 8 veya 12. hafta skoru
- **T3 (follow-up):** 3 ay sonra skor (persistent effect kontrolü)

## Cohen's d hesabı

$$
d = \frac{M_{post} - M_{pre}}{SD_{pooled}}
$$

UpCore bu hesabı otomatik yapar ama aşağıdaki yorumlama ölçeği kullanılır:

| d | Etki büyüklüğü |
|---|---|
| < 0.2 | Trivial (anlamsız) |
| 0.2 – 0.5 | Small (küçük) |
| 0.5 – 0.8 | Medium (orta — klinik anlamlı) |
| \> 0.8 | Large (büyük) |

:::tip
**Medium** (d ≥ 0.5) klinik olarak anlamlı kabul edilir. Aşağısı "var-yok" aralığında tartışmalı.
:::

## Kontrol grubu sorunu

UpCore **randomize kontrollü deney (RCT) değil** — gözlemsel çalışma. Kontrol grubu yok (çünkü "tedavi edilmeyecek yüksek riskli çalışan" etik değil).

Bunu dengelemek için:
- **Matched-pair karşılaştırma:** Benzer profildeki müdahale-almayan ekiplerle karşılaştırma
- **Regression discontinuity:** Eşik altı/üstü karşılaştırma
- **Propensity score matching:** İstatistiksel dengeleme

## Ek ölçümler

Tek BAT-TR yeter değildir. UpCore ek çıktılar ölçer:
- **UWES-9:** Bağlılık değişti mi?
- **Performans:** Yönetici değerlendirme farkı
- **Devamsızlık:** Hastalık izin günü değişimi
- **İşten ayrılma:** 6 ay takip edilir

## Hiçbir etkisi yoksa

Sıfır etki **başarısızlık değildir**, bilgidir:
- Belki yanlış müdahale seçildi — Thompson sampling posterior güncellenir
- Belki çalışan hazır değildi
- Belki dış faktör (aile, sağlık) rolü belirleyici
- Belki sistematik sorun kişisel müdahale çözemez

Bu durumlarda: **alternatif müdahale** veya **eskalasyon**.

## Yayın

Yıllık bias denetim raporu **KVK Kurulu'na** ve public olarak yayımlanır:
- Toplam kaç müdahale yapıldı
- Müdahale türüne göre başarı oranı
- Demografik kırılımda bias var mı
- ML modellerin fairness metrikleri

---
id: cohens-d-yorumu
title: Cohen's d yorumu
sidebar_position: 7
---

# Cohen's d yorumu

Cohen's d **etki büyüklüğü** ölçüsüdür. İstatistiksel anlamlılık (p-değeri) ile karıştırmayın.

## Anlamlılık ≠ büyüklük

- **p < 0.05** → "etki sıfırdan farklı, tesadüf değil"
- **d** → "etki ne kadar büyük, pratik olarak önemli mi?"

Çok büyük örneklemde d=0.05 bile p<0.05 çıkar — ama yararsız.

## Formül

$$
d = \frac{M_1 - M_2}{SD_{pooled}}
$$

Ortalamanın standart sapma biriminde farkı.

## Cohen'ın (1988) yorumlama ölçeği

| d | Etki | Örnek |
|---|---|---|
| 0.2 | Küçük | Boyun gerilimi için çoğu terapi |
| 0.5 | Orta | Kognitif terapi depresyonda |
| 0.8 | Büyük | SSRI antidepressan etkinliği |

## Alan bağımlı yorum

Cohen'ın ölçeği genel geçer ama bazı alanlarda farklı:

- **Eğitim:** d=0.4 eşik kabul edilir (Hattie 2008)
- **Klinik:** d=0.5 klinik önem eşiği
- **İş psikolojisi:** d=0.3 uygulanabilir etki
- **İK müdahaleleri:** d=0.4 hedef (UpCore iç kriter)

## Küçük vs büyük etki — kumul

Küçük bireysel etki × çok çalışan = büyük kurumsal etki:
- d=0.3 × 500 çalışan = %30+ tükenmişlik azalış
- Yıllık işten ayrılma maliyetinden ~2M TL tasarruf
- Hastalık izin azalışı: yıllık ~%12

## Negatif etki

d < 0 → müdahale **zarar verdi**. Kritik uyarı:
- Ciddi durumlarda: müdahale sağlayıcısını denetle
- Sistematik zarar: müdahaleyi katalogdan çıkar (Thompson posterior sıfırla)

## Pratik kontrol listesi

Yıl sonu raporunda her müdahale için:
- [ ] d median ≥ 0.4?
- [ ] d 25. percentile ≥ 0.1 (en kötü vakalarda bile zarar yok)?
- [ ] Drop-out oranı < %10?
- [ ] Çalışan memnuniyet ≥ 4/5?

3'ten fazlasına "hayır" → müdahale review altına alınır.

## Referans

- Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2nd ed.). Lawrence Erlbaum.
- Sawilowsky, S. S. (2009). New effect size rules of thumb. *Journal of Modern Applied Statistical Methods, 8*(2), 597-599.

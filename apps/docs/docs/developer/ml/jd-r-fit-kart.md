---
id: jd-r-fit-kart
title: "Model Card — JD-R Fit v1.3"
sidebar_position: 3
---

# Model Card — JD-R Fit v1.3

## Model detayları

- **Model adı:** jd-r-fit
- **Versiyon:** 1.3
- **Tarih:** 2026-03-20
- **Geliştirici:** UpCore ML Team
- **Tür:** Regression (0-100 fit skoru)
- **Algoritma:** Neural network (3-layer MLP)
- **Framework:** Python 3.12, PyTorch 2.3

## Kullanım amacı

- **Birincil:** Çalışan × rol eşleştirmesi için JD-R (Job Demands-Resources) uyum skoru
- **İkincil:** Kariyer yolu öneri
- **Kullanım dışı:** Otomatik işe alım / kovma

## Feature'lar

- Çalışan yetkinlik profili (Geliştirme modülü yetkinlik haritası)
- Rol gereksinimleri
- Çalışan kişilik profili (VIA 24, UpCap-TR)
- Rol iş talepleri / kaynakları profili
- Geçmiş performans
- Geçmiş bağlılık

## Performans

| Metric | Değer |
|---|---|
| MAE | 8.2 (0-100 ölçekte) |
| RMSE | 11.5 |
| R² | 0.64 |
| MAPE | 12.3% |

Ground truth: 12 ay sonra işte kalma + yüksek performans (2 kriter AND).

## Eğitim verisi

- 80 000 çalışan-rol eşleştirme
- 3 yıllık outcome gözlem
- Türkiye bazlı

## Açıklanabilirlik

SHAP value ile her tahmin açıklanabilir:
- "Skor 78/100 çünkü: özerklik seven + role yüksek özerklik, iletişim güçlü + role müşteri sunumu"

Top-3 feature her öneride sunulur.

## Etik

- Gelişim alanları **yol göstermek** için — engellenmek için değil
- Düşük fit skoru → rol hariç tutma yok, gelişim plan tetikleyici
- Rol başvurusunda skor bilgilendirme amaçlı (çalışan + İK görür)
- **Tek başına** karar değildir — mülakat + referans + iş örneği değerlendirilir

## Bias

- Cinsiyet demographic parity: 0.96
- Yaş grup fairness: 0.93
- Eğitim seviyesi: 0.88 (bazı bias var, gözlem altında)

## Öneriler

- Her 6 ayda retrain (model freshness)
- Şirkete özel fine-tuning opsiyonel (Enterprise)
- Rol değişim hızı yüksek organizasyonlar için yeniden kalibrasyon

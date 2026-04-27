---
id: intervention-recommendation-kart
title: "Model Card — Intervention Recommendation v3.0"
sidebar_position: 4
---

# Model Card — Intervention Recommendation v3.0

## Model detayları

- **Model adı:** intervention-recommendation
- **Versiyon:** 3.0
- **Tarih:** 2026-04-01
- **Geliştirici:** UpCore ML Team
- **Tür:** Multi-armed bandit (contextual Thompson sampling)
- **Framework:** Custom (NumPy + PyTorch for gradient boosted contextual)

## Kullanım amacı

- **Birincil:** Tükenmişlik sinyali olan çalışana en uygun müdahale önerme
- **Keşif / sömürü dengesi:** Thompson sampling ile optimize
- **Kullanım dışı:** Klinik tanı, reçete yazma

## Algoritma detayı

- Her müdahale için **Beta(α, β)** posterior
- Context-aware: çalışan profili + durum özellikleri gradient boosted contextual ile
- Keşif için ε-greedy fallback %10
- Forgetting factor 6 ay

## Kataloğa giriş

Her yeni müdahale katalog maddesi:
- 10 vakaya kadar **uniform prior** (exploration)
- Sonra posterior'dan örneklem

## Performans

Tanı: Ortalama Cohen's d elde edilen müdahalelerde

| Metric | Değer |
|---|---|
| Mean Cohen's d | 0.47 |
| % müdahale d ≥ 0.3 | 62% |
| % müdahale d ≥ 0.5 | 41% |
| % müdahale zarar (d < 0) | 3% |
| Drop-out rate | 8% |

## Eğitim ve üretim veri

- **Bootstrap veri:** Akademik literatür meta-analiz (180 RCT)
- **Canlı veri:** Her müdahale sonrası posterior güncellenir
- **Retraining:** Ayda 1 batch, haftalık incremental

## Açıklanabilirlik

Her öneri için:
- Top-3 müdahale listesi + güven yüzdesi
- "Benzer profillerde son 12 vakada ortalama d=0.52" örnek
- Context feature'larının etkisi (SHAP)

## Etik

- **İnsan karar önceliği:** Öneri top-3, tek değil
- **Çalışan onay:** Açık rıza zorunlu
- **Geri çekilme:** Her an müdahale durdurulabilir
- **Eşit hizmet:** Bias audit demographic
- **Şeffaflık:** Çalışan "neden bu öneri" sorusunu sorabilir

## Bias denetim

- Cinsiyet fairness: 0.97 DI
- Yaş grup fairness: 0.94 DI
- Engellilik durumu: 1.00 DI (özel önem gösterildi)
- Etnik köken: opt-in veri — denetim yeterli örneklem varsa

## Öneriler

- Bir müdahalenin n ≥ 30 vaka olduğunda posterior stabil olur
- Az veri olan müdahaleler için keşif öncelikli (intended feature)
- Yeni sektöre girildiğinde ilk 100 vaka çok dikkatli gözlenmeli
- Klinik escalation triggers ayrı system (bu model değil)

---
id: thompson-sampling
title: Thompson sampling öneri motoru
sidebar_position: 3
---

# Thompson sampling öneri motoru

UpCore, hangi müdahalenin hangi bağlamda işe yarayacağını **multi-armed bandit** algoritması ile öğrenir.

## Problem tanımı

- Her müdahale = "kol" (arm)
- Her vaka = "deneme" (trial)
- Ödül: Cohen's d
- Cevap: Hangi kolu çek? (hangi müdahaleyi öner?)

## Thompson sampling sezgi

Klasik bandit algoritmalarına göre üstünlüğü:
- **Keşif/sömürü dengesi** matematiksel olarak optimal
- **Bayesian güncelleme:** Her veri noktası posterior'u günceller
- **Belirsizlikle yüzleşme:** Az veri → keşif ağırlıklı, çok veri → sömürü

## UpCore'da nasıl?

Her müdahale için sistem **Beta(α, β)** posterior tutar:
- α ← toplam başarılı sonuç (Cohen's d ≥ 0.3)
- β ← toplam başarısız sonuç

Her karar noktasında:
1. Her müdahaleden `Beta(α, β)` dağılımından bir örnek çek
2. En yüksek örneğe sahip müdahaleyi öner
3. Sonuç geldikçe α ve β güncellenir

## Bağlamlı versiyon (Contextual bandit)

Gerçek dünyada "hangi çalışan" + "hangi durum" önemlidir. UpCore contextual bandit için feature'lar:

- Çalışan özellikleri: rol, kıdem, yaş aralığı (anonim clustered), önceki müdahale sayısı
- Durum özellikleri: BAT skorları, ekip büyüklüğü, yönetici ekip büyüklüğü
- Mevsim: ay, quarter

**Gradient boosted contextual bandit** kullanılır — LinUCB değil (karmaşık etkileşimler için esneklik).

## Keşif kontrolü

"Tamamen sömürü" tehlikelidir — yeni müdahaleler hiç denenmez. Bu yüzden:
- **ε-greedy fallback:** %10 olasılıkla rastgele müdahale
- **Initial exploration bonus:** Yeni katalog maddeler için α=1, β=1 (uniform prior)
- **Forgetting factor:** 6 aydan eski veri ağırlığı %50 azaltılır

## Açıklanabilirlik

Öneri ekranında şu gösterilir:

```
1. Çözüm-odaklı koçluk (8 hafta)
   Güven: %72
   Neden: benzer profil (IT, 2-4 yıl kıdem, orta BAT)
   için son 12 vakada ortalama d=0.52
```

Çalışan "neden bana bu önerildi?" diye sorabilir — KVKK Madde 11/g (**otomatik işleme sonucu aleyhe çıkan sonuca itiraz hakkı**).

## Etik

Thompson sampling asla **kararı kendiliğinden almaz**:
- İK uzmanı onay vermeli
- Öneri top-3, tek değil — klinik judgement açıktır
- Çalışan consent'i olmadan başlamaz

## Referans

- Chapelle, O., & Li, L. (2011). An empirical evaluation of Thompson sampling. *NIPS, 24*, 2249-2257.
- Tewari, A., & Murphy, S. A. (2017). From ads to interventions: Contextual bandits in mobile health. *Mobile Health*, 495-517.

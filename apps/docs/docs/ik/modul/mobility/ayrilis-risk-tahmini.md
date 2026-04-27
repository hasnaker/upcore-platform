---
id: ayrilis-risk-tahmini
title: "Ayrılış risk tahmini (ML)"
sidebar_position: 7
---

# Ayrılış risk tahmini (ML)

UpCore ML modeli her çalışanın **90 gün içinde ayrılma olasılığı**nı tahmin eder.

## Model özeti

- **Tür:** XGBoost classification, kalibre edilmiş (Platt scaling)
- **Eğitim verisi:** 180 000 çalışan kaydı, 5 yıllık gözlem (2020-2025)
- **AUC-ROC:** 0.78 (test setinde)
- **Calibration:** Brier score 0.14
- **Fairness:** cinsiyet/yaş/departman için disparate impact < 1.25

Detay: [Ayrılış ML model kartı](/docs/developer/ml/burnout-prediction-kart)

## Özellikler (features)

50+ özellik, önde gelenler:
1. Son pulse BAT-TR skoru
2. Son pulse UWES skoru
3. Yöneticisi ile tenure
4. Son 6 ay izin kullanımı
5. Son 6 ay hastalık izin günü
6. Son 3 ay overtime saati
7. Maaş percentile (piyasa)
8. Son terfi üzerinden geçen süre
9. Eğitim bütçesi kullanımı
10. İç ilan başvuru sayısı
11. 1-1 sıklığı (son 3 ay)
12. LinkedIn profil güncellemesi (opt-in, çalışan izni)
13. E-posta gönderim sayısı (agrega, dışarı)
14. Cinsiyet (bias kontrolü için, tahmin değişkeni değil)

## Risk skoru yorumu

| Skor | Anlam | Aksiyon |
|---|---|---|
| 0-15% | Düşük | İzlem |
| 15-35% | Orta | Yönetici tarafında 1-1'da gündem |
| 35-60% | Yüksek | İK müdahale önerisi |
| 60%+ | Kritik | Retention plan oluştur |

## Retention plan

Yüksek risk → planlı aksiyonlar:
- 1-1 görüşme — "seni dinlemek istiyorum"
- Kariyer konuşması
- Zam / terfi değerlendirmesi
- Rol değişim / rotasyon teklifi
- Yan fayda iyileştirme (evden çalışma, eğitim bütçesi)

## Etik sınırlar

:::warning
Ayrılış risk skoru **asla** işten çıkarma gerekçesi olamaz. Yalnızca retention aksiyonu için kullanılır.
:::

KVKK Madde 22 — "sadece otomatik işleme dayalı ayrımcılık yasağı":
- Tahmin tek başına karar değildir
- İnsan yöneticisi kanıtı değerlendirir
- Çalışan itiraz edebilir

## Çalışan şeffaflığı

Çalışan kendi risk skorunu görebilir (opt-in ayar). Görmek istemeyebilir — UpCore varsayılan **gizli**.

## Model güncelleme

- Her çeyrek retrain (yeni veriler dahil)
- Yıllık bias audit
- Shap value ile açıklanabilirlik
- Model versiyonu logged (audit trail)

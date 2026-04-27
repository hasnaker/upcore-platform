---
id: model-kartlari
title: "ML model kartları (Google Model Cards formatı)"
sidebar_position: 1
---

# ML model kartları (Google Model Cards formatı)

UpCore'da kullanılan ML modelleri için şeffaf model kartları.

## Google Model Card standart

Mitchell et al. (2019) tarafından önerilen standart format:
- Model detayları (versiyon, tarih, tür)
- Kullanım amacı
- Faktörler (demographic, environmental)
- Performans metrikleri
- Değerlendirme verileri
- Eğitim verileri
- Quantitative analiz
- Etik hususlar
- Öneriler ve uyarılar

## UpCore model kartları

1. [Burnout prediction](./burnout-prediction-kart) — tükenmişlik risk tahmini
2. [JD-R fit](./jd-r-fit-kart) — iş-çalışan uyum skoru
3. [Intervention recommendation](./intervention-recommendation-kart) — Thompson sampling öneri

## Versiyonlama

- Her model sürümü ayrı model card
- Versiyonlar aylık yayımlanır (retrain sonrası)
- Eski sürümler arşivde

## Güncelleme politikası

- Model retrained → yeni model card gerekli
- Feature set değişimi → yeni card
- Bias denetim sonrası güncelleme → minor revision

## Public yayınlama

UpCore model kartları public:
- Şeffaflık
- Müşteri due diligence
- Akademik karşılaştırma
- Düzenleyici uyum (EU AI Act, KVKK Madde 22)

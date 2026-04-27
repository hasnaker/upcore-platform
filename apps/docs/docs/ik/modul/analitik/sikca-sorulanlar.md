---
id: sikca-sorulanlar
title: "Analitik — sıkça sorulanlar"
sidebar_position: 10
---

# Analitik — sıkça sorulanlar

## Veriler ne kadar gerçek zamanlıdır?

- Dashboard: 5 dakika gecikmeli
- Rapor: 1 saat
- ML tahmin: günlük
- Bias denetim: haftalık

## Başka bir BI tool kullanıyorum — entegre edebilir miyim?

Evet — Power BI, Tableau, Looker, Metabase destekleniyor. Enterprise'da SQL direct read-only. Starter'da CSV export yeter.

## Neden haftalık bias denetim?

Daha sık = gürültülü rapor, aksiyon üretmez. Haftalık: anlamlı trend yakalar, aksiyonable.

## Executive dashboard'u whitelabel yapabilir miyim?

Enterprise planı: evet. Kendi logo, renk, başlık. API-driven custom widget.

## Veri kaynaklarımı birleştirebilir miyim?

BI tool içinde UpCore verisi + kendi ERP + CRM birleştirme yapılabilir. UpCore içine başka veri import şu an yok (roadmap 2027).

## Yıllık rapor kimin için?

- Yönetim Kurulu
- CFO / CHRO / CEO
- Bağımsız denetim
- KVKK/VERBIS yıllık beyan
- Public faaliyet raporu (listed şirketler için)

## Tahmin modelleri yanlış çıkarsa sorumluluk kime?

UpCore model önerileri **karar destek**, karar değildir. Sorumluluk: **insan yöneticisi** (KVKK md. 22 uygun). UpCore yanlış tahmin için sorumluluk kabul etmez ama:
- Model doğruluğunu sürekli izler
- Kalibrasyon <%70 düşerse retrain
- Transparentlık rapor — %95 güven aralığı her tahminde

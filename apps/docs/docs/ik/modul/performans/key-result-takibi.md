---
id: key-result-takibi
title: "Key Result ilerleme takibi"
sidebar_position: 3
---

# Key Result ilerleme takibi

## Haftalık güncelleme

Her Key Result (KR) haftalık güncellenir. İK ayarları ile zorunlu ya da opsiyonel yapılabilir.

- **Çalışan:** Kendi KR'ını haftalık günceller
- **Yönetici:** Kontrol eder, yorum bırakır
- **Sistem:** Trend alarm verir

## İlerleme türleri

1. **Sayısal ilerleme:** 0 → hedef değer (örn. 100K satış)
2. **Boolean:** Yapıldı / yapılmadı (örn. "ISO sertifika aldık")
3. **Takip milestone:** 4 milestone × %25 (örn. proje fazları)

## Renk kodu

| Durum | Renk | Anlam |
|---|---|---|
| On track | 🟢 | İlerleme beklenen hızda |
| At risk | 🟡 | Yavaş ama muhtemel |
| Off track | 🔴 | Hedef kaçırma ihtimali yüksek |
| Done | ✅ | Tamamlandı |

Sistem otomatik belirler: beklenen% = (geçen gün / toplam gün) × 100. Gerçek % bu değere göre renk.

## Engelleyici işaretleme

KR güncelleme ekranında engelleyici (blocker) alanı vardır:
- "Teknik borç 3 story point'lik bir task'ı kilitledi"
- "Satıcı teslim geciktiriyor"
- "Yönetici onayı 2 haftadır bekliyor"

Bu engelleyiciler 1-1 görüşmede otomatik gündemlenir.

## Eski verileri düzenleme

KR değerleri **geriye dönük değiştirilemez**. Yanlış güncelleme yapıldıysa:
- Yönetici onay ile düzeltme request
- Audit log'a düzeltme kaydı (eski değer + yeni değer + sebep)

## KR skor hesabı

Çeyrek sonu:
- Her KR %0-%150 arası skor (stretch goals için)
- Objective skoru = KR'ların ağırlıklı ortalaması (ağırlıkları %0-100)

:::info
%100 hedefin altı kötü değildir. Google'da ortalama OKR skoru %70-80. %100 → "çok kolay koymuşsunuz"; %50 → "çok ambitious koymuşsunuz".
:::

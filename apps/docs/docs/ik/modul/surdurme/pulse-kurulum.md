---
id: pulse-kurulum
title: Pulse anketi kurulumu
sidebar_position: 2
---

# Pulse anketi kurulumu

Pulse anketinin detaylı adım-adım kurulumu.

## 1. Şablon seçimi matrisi

| Amaç | Önerilen şablon | Sıklık |
|---|---|---|
| Tükenmişlik izleme (genel) | BAT-12-TR | 2 haftada 1 |
| İş bağlılığı | UWES-9 | Ayda 1 |
| Psikososyal risk denetimi | COPSOQ-III-TR | Yılda 2 |
| Pre/post müdahale etki ölçümü | BAT-12-TR + custom | Her çeyrek |
| Yeni başlayan ilk 90 gün | Onboarding 5-madde | Günde 1, 2 hafta |

## 2. Cadence stratejisi

- **İlk 3 ay:** İki haftada bir — sistem öğrenirken veri hacmi gerekli
- **Stabil dönem:** Ayda bir — katılım oranını koru
- **Kriz sonrası:** Haftalık — hızlı iyileşme izlemi

## 3. Rotasyon kuralları

- **Soru rotasyonu:** Her pulse farklı 3–8 madde (test-retest yorgunluğunu önler)
- **Çalışan rotasyonu:** 500+ kişilik şirketlerde sistem her pulse'ta %50 örneklem alır — kişi başına yılda ~13 pulse (haftada bir değil)

## 4. Zamanlama önerileri

| Gün | Cevap oranı | Not |
|---|---|---|
| Pazartesi | %42 | Hafta başı stresi, düşük katılım |
| Salı | %68 | En yüksek (önerilen) |
| Çarşamba | %61 | İyi alternatif |
| Perşembe | %54 | Toplantı yoğun |
| Cuma | %38 | Hafta sonu zihniyeti |

İdeal saat: **10:00** (öğleden önce kahve sonrası).

## 5. Hatırlatıcı ayarları

- 1. hatırlatıcı: 72 saat sonra
- 2. hatırlatıcı: 7 gün sonra
- 3. hatırlatıcı: (yalnızca kritik anketler) 12 gün sonra
- **Uyarı:** 3'ten fazla hatırlatıcı → ters etki, "UpCore spamı" algısı

## 6. Otomatik aksiyonlar

Cevap geldikçe:

- Kırmızı banda düşen çalışan için İK'ya alarm (1 saat SLA)
- Yönetici dashboard'u otomatik yenilenir
- Agrega ≥5 eşiğinde heatmap güncellenir
- ML modeli (burnout-prediction) posterior update alır

## 7. İlk pulse için kontrol listesi

- [ ] Şablon seçildi
- [ ] Kitle belirlendi
- [ ] Özel soru eklendi (1–2 taneden fazla değil)
- [ ] Gönderim zamanı Salı 10:00
- [ ] Aydınlatma metni güncel
- [ ] Kritik ekip < 5 kişi kontrolü yapıldı
- [ ] Yönetici bilgilendirildi ("Çalışanlarınıza bu hafta pulse gidecek")

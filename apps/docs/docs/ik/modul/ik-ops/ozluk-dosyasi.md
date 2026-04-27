---
id: ozluk-dosyasi
title: "Özlük dosyası"
sidebar_position: 2
---

# Özlük dosyası

Her çalışan için zorunlu ve opsiyonel bilgileri tutan merkez kayıt.

## Zorunlu alanlar (İK Yönetmeliği)

- TCKN (11 haneli)
- Ad, soyad
- Doğum tarihi + yeri
- Anne/baba adı
- Medeni durum
- Adres
- SGK sicil no (otomatik üretilir)
- İşe giriş tarihi
- Pozisyon + departman
- Maaş (brüt)
- IBAN (maaş)

## Opsiyonel alanlar

- Eş ve çocuk bilgisi (AGİ hesabı için)
- Askerlik durumu
- Engellilik oranı (ÖNG muafiyeti için)
- Eğitim durumu
- Ehliyet sınıfı
- Yabancı dil
- Acil durum iletişim
- Fotoğraf

## Dosya ekleri

Zorunlu belgeler:
- Kimlik fotokopisi
- İkametgah
- Diploma
- Sabıka kaydı (son 3 ay)
- Sağlık raporu (işe girişte)
- Askerlik belgesi (erkekler için)
- İş sözleşmesi (imzalı)
- KVKK aydınlatma imzalı örnek

Opsiyonel:
- SGK hizmet dökümü
- Referans mektupları
- Sertifikalar

## Elektronik imza

- Çalışan dijital imza (e-imza) veya mobil imza ile onaylayabilir
- İşveren İK müdürünün e-imzası
- Zaman damgası (TSE/TurkTrust)

## Saklama süreleri

| Belge türü | Süre | Mevzuat |
|---|---|---|
| İş sözleşmesi | 5 yıl (ayrıldıktan sonra) | TBK 146 |
| Bordro | 5 yıl | VUK |
| SGK belgeler | 10 yıl | SGK |
| İş kazası | 30 yıl | İSG |
| Kimlik fotokopisi | 5 yıl | SGK |

Süre sonunda otomatik silme (ya da anonimleştirme).

## KVKK uyumluluğu

- Açık rıza gerektiren alanlar ayrı (örn. fotoğraf, sağlık)
- Tüm PII alanları pgcrypto ile şifrelenir (at-rest)
- Audit log her erişim için (kim okudu, ne zaman)
- Çalışan self-servis portal — Madde 11 hakları

## İç değişim

Çalışan kendi profilini güncelleyebilir (belirli alanlar):
- Adres, telefon, acil iletişim
- Eş/çocuk bilgisi (AGİ için)

Yönetici tarafında güncellenen:
- Pozisyon, maaş (onay akışı)
- Departman değişimi

Otomatik kaynaklardan gelen:
- SGK hizmet dökümü senkronu (iki haftada bir)
- e-Devlet adres güncellemesi

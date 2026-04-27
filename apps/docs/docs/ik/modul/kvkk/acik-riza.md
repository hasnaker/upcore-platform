---
id: acik-riza
title: "Açık rıza şablonu"
sidebar_position: 5
---

# Açık rıza şablonu

KVKK Madde 6/2 — özel nitelikli kişisel veriler için açık rıza zorunlu.

## Özel nitelikli kişisel veriler (md. 6/1)

- Irk, etnik köken
- Siyasi düşünce
- Felsefi inanç
- Din, mezhep
- Dernek / vakıf / sendika üyeliği
- Sağlık verileri
- Cinsel hayat
- Ceza mahkumiyeti + güvenlik tedbirleri
- Biyometrik
- Genetik

## Açık rıza = **açık + özgür + bilgilendirilmiş + spesifik**

1. **Açık:** Örtülü, varsayılan, sessiz rıza geçersiz
2. **Özgür:** Ret hakkı olmalı — işten çıkarma tehdidi ile rıza olmaz
3. **Bilgilendirilmiş:** Aydınlatma metni + spesifik amaç
4. **Spesifik:** Her farklı amaç için ayrı rıza

## UpCore'da açık rıza gerektiren işlemler

1. **Müdahale programı** (sağlık verisi üretir)
2. **Referral psikolog programı** (sağlık)
3. **Biyometrik PDS** (giriş-çıkış sistemi)
4. **LinkedIn profil izleme** (retention tahmini için, opt-in)
5. **Fotoğraf pazarlama kullanımı** (website, LinkedIn)

## Şablon

```
AÇIK RIZA METNİ

[Spesifik amaç, örn. "Tükenmişlik müdahale programı — 8 haftalık koçluk"]

Bu rıza metni, [amaç] için kişisel verilerimin işlenmesine ilişkindir.

### İşlenecek veriler
- [spesifik liste]

### Amaç
- [spesifik amaç]

### Hukuki sebep
- KVKK Madde 6/2 — açık rıza

### Süre
- [spesifik süre, örn. "Müdahale bitimine kadar + 7 yıl arşiv"]

### Ret hakkı
- Bu rızayı vermezsem [sonuç — olmamalı ki "işten çıkarılma"]. Rızam
  yalnızca [spesifik amaç] için geçerli. İstediğim zaman geri çekebilirim.
  Geri çekme tarihinden sonraki işlemeyi durdurur.

### Madde 11 hakları
- [özet]

Açıkça beyan ediyorum ki yukarıda belirtilen şartlar altında
kişisel verilerimin işlenmesine RIZA GÖSTERİYORUM.

[Ad-Soyad]
[İmza / e-imza]
[Tarih]
```

## Rıza kaydı

UpCore her rıza için:
- Rıza metni hash'i (tamperproof)
- Çalışan dijital imza hash'i
- Timestamp (TSE)
- IP + device
- Audit log'a WORM kayıt

## Geri çekme

Her açık rıza **geri çekilebilir** (md. 11/e ve 7/1):
- Portal üzerinden self-servis
- Geri çekme tarihi → o noktadan sonraki işleme durur
- Eski veriler saklama politikasına göre

## Yanlış uygulama örnekleri

**Kabul edilemez** rıza:
- "Bu formu imzalamadan işe başlayamazsınız" → özgür değil
- Tek tik tüm amaçlara onay → spesifik değil
- Aydınlatma metni ile birleşik "Yukarıdakiler okundu, kabul ediyorum" → açık değil
- Çalışan pdf indirir, imzalar, teslim eder — sonra iptal edemez → geri çekme hakkı ihlali

## Denetim

KVK Kurulu denetiminde:
- Rıza metni örneği
- Rıza kayıt süreci (nasıl alındı, nasıl saklanıyor)
- Geri çekme süreç
- İhlal durumunda çalışana bilgilendirme

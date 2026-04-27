---
id: genel-bakis
title: "İK Ops modülü — genel bakış"
sidebar_position: 1
---

# İK Ops modülü — genel bakış

İK Operasyon modülü; özlük, sözleşme, izin, bordro, SGK, iş kazası gibi klasik İK işlerini **Türkiye mevzuatına uyumlu** olarak yönetir.

## Yasal çerçeve

- **4857 sayılı İş Kanunu** (özel sektör işçi)
- **657 sayılı Devlet Memurları Kanunu** (kamu memuru)
- **5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu**
- **6356 sayılı Sendikalar ve Toplu İş Sözleşmesi Kanunu**
- **6331 sayılı İş Sağlığı ve Güvenliği Kanunu**
- **193 sayılı Gelir Vergisi Kanunu** (bordro)
- **213 sayılı Vergi Usul Kanunu** (kayıt saklama)

## Bileşenler

- **Özlük dosyası** — tam çalışan profil, KVKK uyumlu saklama
- **Sözleşme yönetimi** — iş sözleşmesi, ek sözleşme, KVKK aydınlatma
- **İzin yönetimi** — yıllık, hastalık, idari, doğum, ücretsiz
- **Bordro hesaplama** — maaş + kesintiler + net
- **SGK e-Bildirge** — APB, İGB, İAB XML
- **Kıdem tazminatı hesabı**
- **Mesai ve fazla çalışma**
- **İş kazası bildirim**
- **İş güvenliği belgeleri**

## Personel tipleri

UpCore'da 4 personel tipi desteklenir:

| Kod | Açıklama | Mevzuat |
|---|---|---|
| MEMUR_657 | Devlet memuru | 657 DMK |
| 4B | Sözleşmeli personel (kamu) | 657 DMK 4/B |
| 4857 | İş Kanunu'na tabi işçi | 4857 İK |
| STAJYER | Stajyer | 4857 + Mesleki Eğitim Kanunu |

Her tip için farklı kesinti, izin, tazminat kuralı.

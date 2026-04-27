---
id: giris
title: KVKK rehberine genel bakış
slug: /ik/kvkk/giris
sidebar_position: 1
---

# KVKK rehberine genel bakış

6698 sayılı Kişisel Verilerin Korunması Kanunu'na uyumlu bir İK süreci kurmak için UpCore'un sunduğu tüm kaynaklar bu bölümdedir.

## İşlem akışları

- [Madde 11 talep yönetimi](/docs/ik/modul/kvkk/madde-11-talep-yonetimi) — çalışan talepleri
- [VERBIS kayıt süreci](/docs/ik/modul/kvkk/verbis-kayit-sureci) — Kişisel Verileri Koruma Kurumu sicili
- [Aydınlatma metni şablonu](/docs/ik/modul/kvkk/aydınlatma-metni) — 12 kategori için
- [Açık rıza şablonu](/docs/ik/modul/kvkk/acik-riza) — özel nitelikli veriler için
- [DPIA şablonu](/docs/ik/modul/kvkk/dpia-sablon) — 3 yüksek riskli işleme kategorisi
- [İhlal bildirim akışı](/docs/ik/modul/kvkk/ihlal-bildirim-72-saat) — 72 saat SLA

## Hızlı cevaplar

### Hangi verileri işliyoruz?
UpCore'da işlenen veri kategorileri:
- Kimlik (ad, TCKN, doğum tarihi)
- İletişim (telefon, e-posta)
- Özlük (bordro, izin, sözleşme)
- Mesleki deneyim
- Pulse/anket cevapları (pseudonymized)
- Özel nitelikli: sağlık raporu (izin için), iş kazası
- Özel nitelikli YOKsaydığımız: siyasi görüş, inanç, etnik köken, cinsel yönelim, biometrik

### Kaç yıl saklıyoruz?
- İş sözleşmesi: 5 yıl (TBK 146)
- Özlük: ayrılış sonrası 10 yıl (SGK)
- Bordro: 5 yıl (VUK)
- İş kazası: 30 yıl
- Pulse cevapları: 7 yıl (sonra anonimleştirilir)

### Yurt dışına aktarıyor muyuz?
Hayır. Tüm veriler **Türkiye'de** (Azure West Europe'da opt-in ile Avrupa) işlenir. AWS, GCP kullanmıyoruz.

## Politika sahibi

- Uyum sorumlusu: `compliance@upcore.io`
- KVK Kurulu talep: 30 gün SLA içinde yanıt
- DPA imzalı müşteri sayısı: aylık yayın

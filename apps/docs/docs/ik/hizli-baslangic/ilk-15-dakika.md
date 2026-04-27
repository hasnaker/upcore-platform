---
id: ilk-15-dakika
title: "İlk 15 dakika — yeni İK için hızlı başlangıç"
sidebar_position: 1
---

# İlk 15 dakika — yeni İK için hızlı başlangıç

Bu rehber, UpCore hesabınızı açtığınız andan itibaren **çalıştırabilir** bir sisteme sahip olmanız için 15 dakikalık bir akış sunar.

## Ön koşullar

- Clerk oturumu açık
- Admin / İK rolü atanmış
- Çalışan listesi hazır (CSV, maks 10 000 satır)

## Dakika 0–3: Organizasyon tanımı

1. **Ayarlar > Organizasyon** sayfasına gidin
2. Şirket bilgilerini tamamlayın:
   - Ticari unvan
   - Vergi numarası
   - Merkez adresi
   - Çalışan sayısı aralığı
3. Para birimi: **TRY** (varsayılan)
4. Takvim: **Türkiye resmi tatil takvimi** aktif et

## Dakika 3–7: Departman yapısı

1. **Organizasyon > Departmanlar**
2. Ağaç yapısını kurun — her departman en az 1 yönetici atanır
3. Kritik pozisyonları **⭐** ile işaretleyin (succession için)

:::tip
Hatalı hiyerarşi → hatalı agrega. Bir kez doğru kurun.
:::

## Dakika 7–10: Çalışan import

1. **Çalışanlar > İçe aktar**
2. CSV şablonunu indirin — 22 zorunlu alan
3. Doldurup yükleyin — preview'da hata varsa gösterilir
4. Onay → arka planda async import başlar (10 000 kayıt için ~2 dk)

## Dakika 10–12: Pulse cadence

1. **Sürdürme > Cadence ayarları**
2. Sıklık: **2 haftada bir** (varsayılan, önerilir)
3. Soru havuzu: **BAT-12-TR** + "Ekip iletişimi" özel sorusu
4. İlk gönderim zamanı: **Salı 10:00**

## Dakika 12–15: Yönetici davetleri

1. **Kullanıcılar > Rol atamaları**
2. Her departman yöneticisine **Manager** rolü verin
3. Topluca e-posta daveti gönderin
4. MFA zorunluluk aktif

## Tebrikler

Sistem çalışır durumda. İlk pulse Salı saat 10'da gidecek.

**Sonraki adım:** [İlk pulse anketi kurulum detayları](./ilk-pulse-anketi)

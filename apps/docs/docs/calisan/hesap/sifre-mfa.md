---
id: sifre-mfa
title: Şifre ve MFA yönetimi
sidebar_position: 3
---

# Şifre ve MFA yönetimi

## Şifreyi değiştir

1. Hesap menüsü > **Güvenlik** sekmesi
2. **Şifreyi değiştir** butonu
3. Mevcut şifre + yeni şifre (2 kez) + MFA kodu ile onay
4. Değişiklik anında geçerli — tüm aktif oturumlar sonlandırılır.

## MFA yeniden kurulum

Telefon değiştirdiyseniz:

1. **Güvenlik** sekmesi > **MFA**
2. Mevcut cihazdan son bir kod girin
3. Yeni QR kodu tarayın ve 6 haneli kodu girin
4. Yedek kurtarma kodlarını güvenli yere (örn. parola yöneticisi) kaydedin — 10 tane üretilir, her biri bir kez kullanılır

## Cihazlarım

**Güvenlik > Aktif oturumlar** sayfasında:

- Son kullanılan cihazları ve IP'leri görebilirsiniz
- Tek tek ya da toplu oturum sonlandırabilirsiniz
- Bilmediğiniz bir cihaz varsa: hemen şifre değiştirin + İK'ya haber verin

## API token (geliştirici)

Kendiniz API kullanmak istiyorsanız (nadir):

- **Güvenlik > API Anahtarları**
- Read-only veya read-write kapsam seçin
- 90 gün içinde kullanılmazsa otomatik iptal

:::danger
API anahtarını e-posta, Slack veya herkese açık repo'ya **asla** göndermeyin. Sızarsa `kvkk@upcore.io`'yu derhal uyarın.
:::

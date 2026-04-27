---
id: ilk-giris
title: İlk giriş ve hesap aktivasyonu
sidebar_position: 1
---

# İlk giriş ve hesap aktivasyonu

İK'nız sizi sisteme eklediğinde şirket e-postanıza bir davet linki gelir.

## Adımlar

1. E-postadaki **"Hesabımı aktifleştir"** butonuna tıklayın (link 7 gün geçerlidir).
2. Parola oluşturun — en az 12 karakter, büyük/küçük harf + rakam + özel karakter.
3. İki faktörlü kimlik doğrulamayı (MFA) kurun.
4. KVKK aydınlatma metnini okuyun ve açık rızanızı işaretleyin.

## Parola kuralları

- En az 12 karakter
- NIST 800-63B tavsiyesi: uzun şifre > karmaşık şifre
- 2 yıl içinde başka ihlal veritabanında yer almamış olmalı (otomatik kontrol)

## MFA seçenekleri

| Yöntem | Güvenlik | Hız |
|---|---|---|
| Authenticator app (önerilen) | Yüksek | 2 sn |
| SMS | Orta | 5 sn |
| E-posta | Düşük — sadece yedek | 10 sn |

:::warning Önemli
SMS tek başına yeterli değildir — SIM-swap riskine karşı Authenticator app + SMS yedek öneririz.
:::

## Giriş yapamıyorum

- **Link süresi dolmuş:** İK'nıza yeni davet göndermesini söyleyin.
- **Parolamı unuttum:** Giriş sayfasında "Parolamı unuttum" → e-posta ile sıfırlama linki.
- **MFA cihazım kayıp:** İK operatörü yedek kod üretip gönderebilir.

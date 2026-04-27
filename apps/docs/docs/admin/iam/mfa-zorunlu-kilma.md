---
id: mfa-zorunlu-kilma
title: "MFA zorunlu kılma"
sidebar_position: 5
---

# MFA zorunlu kılma

## Politika seviyeleri

- **Advisory** — çalışan öneri alır, zorunlu değil
- **Enforced for admin** — sadece admin rolleri
- **Enforced for all** — tüm kullanıcılar
- **Enforced with grace period** — 30 gün içinde kurun

## MFA metotları

| Metot | Güvenlik | Hız | Önerilir mi? |
|---|---|---|---|
| Authenticator app (TOTP) | Yüksek | 2 sn | Evet |
| SMS | Orta | 5 sn | SIM-swap riski, yedek olabilir |
| E-posta OTP | Düşük | 10 sn | Sadece yedek |
| WebAuthn / FIDO2 | Çok yüksek | 1 sn | Ultra-güvenli, öneri |
| Backup kodları | Yüksek | Anlık | Kurtarma için zorunlu |

## Kurulum akışı

1. Kullanıcı giriş
2. MFA kurulmamışsa zorunlu flow
3. Authenticator app + QR → 6 haneli kod onay
4. 10 adet backup code indirme
5. Tamamlama

## Cihaz kaybı

Çalışan cihazını kaybettiyse:
1. Backup code ile giriş
2. Admin panelden MFA reset (audit log'a yaz)
3. Yeni cihaz kurulum

## Compliance

- SOC 2 Type II: MFA zorunlu (admin + data access)
- ISO 27001: Kontrol A.9.4.2
- KVKK: md. 12 güvenlik tedbiri

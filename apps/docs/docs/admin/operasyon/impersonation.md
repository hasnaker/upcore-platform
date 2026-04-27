---
id: impersonation
title: "Impersonation (vekaletsiz giriş)"
sidebar_position: 4
---

# Impersonation (vekaleten giriş)

Destek çalışanının müşteri hesabına geçici erişim.

## Ne zaman kullanılır?

- Destek ticketı çözümü
- Bug reproduction
- Demo (consentli)

## Akış

1. Admin talebi — gerekçe zorunlu
2. Müşteri (tenant admin) **onay** (e-posta ile)
3. Onay alındıktan sonra 1 saat geçerli session
4. Her aksiyon audit log'a "impersonated by X" notu ile
5. Session kapanır → session geçmişi müşteri ile paylaşılır

## Sınırlar

Impersonation sırasında **yapılamayanlar**:
- Şifre değiştirme
- MFA kurulumu
- Hassas veri indirme (maaş, TCKN)
- Yeni admin atama
- Feature flag değişimi (üretim)

## Çalışana bildirim

Impersonation başladığında + bittiğinde:
- Etkilenen çalışana anında e-posta
- Dashboard'da notification banner
- Ek açıklama: "UpCore destek ekibi hesabınıza teknik sebeple erişti"

## Audit

- Tüm impersonation WORM audit log'a
- Aylık rapor müşteriye
- Olağandışı kullanım (>5 kez/ay) → müşteri güvenlik alarmı

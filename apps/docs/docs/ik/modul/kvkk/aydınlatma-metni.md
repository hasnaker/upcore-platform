---
id: aydınlatma-metni
title: "Aydınlatma metni şablonu"
sidebar_position: 4
---

# Aydınlatma metni şablonu

KVKK Madde 10 — aydınlatma yükümlülüğü.

## Zorunlu bilgiler

Her aydınlatma metninde olmalı:
1. Veri sorumlusunun kimliği
2. Kişisel veri kategorisi
3. Kişisel verinin işlenme amacı
4. İşlemenin hukuki sebebi (md. 5)
5. Aktarım alıcıları + sebebi
6. Yöntem (otomatik / manuel)
7. Madde 11 hakları

## UpCore şablonları (12 adet)

1. **İşe alım başvurusu** — aday verileri
2. **İşe giriş** — kabul sonrası özlük
3. **Pulse anketi** — çalışan bağlılık
4. **Performans değerlendirme** — 360, OKR
5. **Müdahale programı** — özel nitelikli veri
6. **Bordro işleme** — mali veri
7. **SGK bildirim** — 3. taraf aktarım
8. **Ziyaretçi / müşteri** — ofis girişi
9. **Kamera kayıt** — fiziksel güvenlik
10. **Pazarlama iletişimi** — potansiyel müşteri
11. **Web sitesi çerez** — dijital izleme
12. **İş kazası** — sağlık verisi

## Şablon yapısı

```
[Şirket Logo]
[Şirket Tam Ünvan]

KİŞİSEL VERİLERİN KORUNMASI HAKKINDA AYDINLATMA METNİ

Sayın [Veri Sahibi],

Bu aydınlatma metni, [açıklama amacı] kapsamında, 6698 sayılı KVKK
Madde 10 uyarınca kişisel verilerinizin işlenmesi hakkında sizi
bilgilendirmek amacıyla hazırlanmıştır.

### 1. Veri Sorumlusunun Kimliği
[Şirket Ünvanı]
[Adres]
[KVKK İletişim: kvkk@domain.com]

### 2. Kişisel Veri Kategorileri
...

### 3. Amaçlar ve Hukuki Sebep
...

### 4. Aktarımlar
...

### 5. Saklama Süreleri
...

### 6. Madde 11 Hakları
Kişisel verileriniz hakkında aşağıdaki haklara sahipsiniz: ...

### 7. İletişim ve Başvuru
[KVKK başvuru adresi]
```

## Yasal dil

- **Basit Türkçe** kullanın (yargıtay kararları okunabilirliği vurguluyor)
- Yabancı kelime + teknik jargon minimal
- Her kategoriye somut örnek

## UI/UX iyi uygulama

- Aydınlatma metni **her seferinde** gösterilmez (ilk kez + değişiklik)
- Ayrı sayfa / modal
- Okumadan geçme engellenmeli (scroll-to-bottom + onay checkbox)
- Metin PDF indirilebilir (saklama)
- Çalışan kendisine gönderilmiş versiyon arşiv

## Değişiklik senaryosu

Aydınlatma metninde değişim (yeni amaç, yeni 3. taraf):
- Yeni metin hazırla
- Çalışanlara **yeniden sunum** + onay
- Eski metin arşiv (audit için)
- Değişiklik tarihi kayıt

## Çok dilli destek

- Türkçe (zorunlu)
- İngilizce (Enterprise müşteriler, uluslararası çalışan)
- Gerekirse diğer diller (Arapça, Rusça)

## Yargıtay içtihat

Aydınlatma zayıflığı gerekçesiyle:
- Veri işleme **baştan geçersiz** olabilir
- Çalışan tazminat alabilir
- KVK Kurulu idari para cezası
- "Bulanık aydınlatma" = aydınlatma yok

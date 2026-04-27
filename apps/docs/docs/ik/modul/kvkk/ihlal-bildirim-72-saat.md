---
id: ihlal-bildirim-72-saat
title: "İhlal bildirim (72 saat)"
sidebar_position: 7
---

# İhlal bildirim (72 saat)

KVKK Madde 12/5 — kişisel veri ihlali halinde bildirim yükümlülüğü.

## İhlal tanımı

Kişisel verilerin:
- Kazara veya hukuka aykırı yok edilmesi
- Kaybolması
- Değiştirilmesi
- İzinsiz ifşa edilmesi
- Erişilmesi

**GDPR uyumlu Türkçe tanım** — her türlü gizlilik, bütünlük, erişilebilirlik ihlali.

## 72 saat kuralı

KVK Kurulu'na bildirim **en geç 72 saat** içinde. Sürenin başlangıcı:
- Veri sorumlusunun ihlalden **farkındalık** zamanı (not: meydana gelme zamanı değil)

## İhlal kategorileri

### Düşük risk
- Şirket içi yanlışlık — veri dış sızmadı
- Otomatik olarak tespit edilen ve düzeltilen
- Etkilenen kişi sayısı az
- Özel nitelikli veri yok

**Bildirim:** Genelde bildirilmez (risk-based approach), iç kayıt şart.

### Orta risk
- Şirket içinde yanlış erişim
- Veri dışa sızdı ama izinsiz kullanım kanıtı yok
- Özel nitelikli veri orta ölçek

**Bildirim:** KVK Kurulu'na zorunlu (72 saat).

### Yüksek risk
- Dış hack, ransomware
- Büyük ölçekli sızıntı
- Özel nitelikli veri sızdı
- Potansiyel kimlik hırsızlığı

**Bildirim:** KVK Kurulu + **etkilenen veri sahiplerine** ayrı ayrı (md. 12/5).

## UpCore ihlal yönetim akışı

1. **Tespit:** SIEM alarmı, çalışan raporu, dış kaynak
2. **Değerlendirme:** DPO + CISO + İK 2 saat içinde senkron
3. **Triage:** Risk kategorisi belirleme
4. **Kontrol alma:** Tehdit durdurma (şifre reset, IP blok)
5. **Kapsam belirleme:** Hangi veriler etkilendi?
6. **Bildirim:** KVK Kurulu formu + (gerekirse) veri sahiplerine
7. **Kök neden:** Teknik + süreç
8. **Düzeltme:** Uzun vadeli önlem
9. **İletişim:** Kamuoyu açıklama (public companies)

## Bildirim formu

KVK Kurulu "Veri İhlali Bildirim Formu":
- İhlal tarihi / tespit tarihi
- İhlal türü (siber saldırı, yetkisiz erişim, kayıp, vb.)
- Etkilenen veri kategorileri
- Etkilenen kişi sayısı
- Olası sonuçlar
- Alınan önlemler
- DPO iletişim

## Bildirim dili

- Net, teknik jargon yok
- Yaşanan gerçek
- Abartı yok, eksiltme yok
- Kural: KVK Kurulu ile şeffaflık + güven

## İdari para cezası

Bildirim yapılmaması / geç yapılması:
- **500 000 TL'ye kadar** idari para cezası
- Ağır ihlal + büyük ölçek → daha yüksek

Bildirim yapılması bile tek başına sorumluluğu kaldırmaz — alınan önlemlerin yeterliliği değerlendirilir.

## İç runbook

UpCore'da hazır runbook:
- Adım adım akış
- Rol matrisi (kim, ne, ne zaman)
- Template bildirim metni
- Basın açıklama draft
- Çalışan bilgilendirme template

Tatbikat (game day) yıllık **zorunlu**.

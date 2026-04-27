---
id: madde-11-talep-yonetimi
title: "KVKK Madde 11 talep yönetimi"
sidebar_position: 2
---

# KVKK Madde 11 talep yönetimi

Çalışanlardan gelen veri sahibi taleplerinin İK tarafı.

## 8 hak (özet)

Detay: [Çalışan perspektifinden Madde 11](/docs/calisan/kvkk/madde-11-haklar).

İK olarak gelen talepler:
1. Veri işleniyor mu? (a)
2. İşleniyorsa bilgi iste (b)
3. Amacı öğren (c)
4. Aktarım öğren (ç)
5. Düzeltme talebi (d)
6. Silme talebi (e)
7. Düzeltmelerin 3. taraflara bildirim (f)
8. Otomatik karar itirazı (g)
9. Tazminat talebi (ğ)

## Süre yönetimi

- **Yanıt süresi:** 30 gün (md. 13/2)
- **Karmaşık talepler için:** 60 gün uzatma, **yazılı gerekçe ile**
- **Ücret:** Madde 13/2 — **ücretsiz** (10 sayfadan fazla çoğaltma için sayfa başı maliyet)

Süre geçerse: KVK Kurulu şikayeti + potansiyel idari para cezası.

## Talep kanalları

UpCore otomatik:
- **Self-servis portal:** `app.upcore.io/kvkk`
- **E-posta:** `kvkk@upcore.io` (auto-ticket)
- **KEP:** kayıtlı elektronik posta
- **Posta / elden:** manuel sisteme girme

## İş akışı

1. **Talep gelir** → otomatik ticket oluşur
2. **Kimlik doğrulama** → TCKN + MFA (kendi hesabıysa)
3. **Sınıflandırma** → İK uzmanı türüne ayırır
4. **Araştırma** → İlgili veriler toplanır
5. **Karar** → Onay / kısmi onay / red
6. **Yanıt** → Yazılı cevap + (onay ise) veri / aksiyon
7. **Kayıt** → Audit log'a yaz

## Sistem otomasyonları

- Veri indirme talebi → arka planda arşiv üretir, şifrelenmiş link
- Düzeltme → değişiklik sonrası 3. taraflara otomatik bildirim
- Silme → saklama süresi biten verileri siler (yasal sebeple koruması gerekenler dışında)
- Otomatik karar itirazı → human review queue

## Red gerekçeleri

Talep reddedilebilir durumlar:
- Yasal saklama süresi doldu yok (bordro 5 yıl)
- Suç soruşturması (yetkili makam talebi)
- Hukuki iddia (devam eden dava kanıtı)
- Açık rıza ile işleniyor ve çalışan rızayı geri almadı
- Hakkın kötüye kullanımı (sık tekrarlanan, zahmet ver)

Red mutlaka **yazılı ve gerekçeli**.

## İtiraz süreç

Red kararına çalışan:
1. KVK Kurulu'na şikayet
2. İş Mahkemesi'ne tazminat davası
3. 30 gün içinde itiraz (md. 14)

## Raporlama

Aylık/yıllık:
- Gelen talep sayısı
- Talep türü dağılımı
- Ortalama yanıt süresi
- Red oranı
- Red nedenleri

Bu rapor **VERBIS yıllık beyanında** zorunlu.

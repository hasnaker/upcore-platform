---
id: saklama-politikasi
title: "Saklama politikası"
sidebar_position: 8
---

# Saklama politikası

Her veri kategorisinin saklama süresi + silme prosedürü.

## Zorunlu saklama süreleri

| Veri | Süre | Mevzuat |
|---|---|---|
| İş sözleşmesi | 5 yıl (ayrılış sonrası) | TBK md. 146 |
| Bordro | 5 yıl | VUK md. 253 |
| SGK belgeler | 10 yıl | SGK |
| İş kazası kayıtları | 30 yıl | 6331 İSG |
| Sağlık raporu | 20 yıl | Tıbbi etik |
| Özlük fotokopisi | 5 yıl | SGK |
| Vergi belgesi | 5 yıl | VUK |
| Denetim / soruşturma | Dava süresi + 5 yıl | Hukuki |
| Ticari belgeler | 10 yıl | TTK |

## UpCore'da saklama politikası

| Kategori | UpCore saklama |
|---|---|
| Çalışan aktif | Ayrılıştan 5-10 yıl sonra (yasal minimum) |
| Pulse cevapları | 7 yıl → anonimleştirme |
| 360 değerlendirme | 5 yıl |
| Müdahale kayıtları | 7 yıl (klinik), sonra anonim |
| Kamera kaydı | 30 gün (güvenlik) |
| Log kayıtları | 1 yıl (audit), 10 yıl WORM (KVKK) |
| E-posta yedek | 1 yıl |
| Toplantı kaydı | 90 gün (opsiyonel) |
| LinkedIn profil (opt-in) | 30 gün |
| Pazarlama | Rıza geri çekene kadar |

## Otomatik silme

Süre dolunca UpCore otomatik:
- **Hard delete:** Kategori silme politikasına göre
- **Anonymization:** TCKN hash, isim → "Anonim-ABCD", lokasyon → "İl-X"
- **Archive:** 7 yıl soğuk arşiv, sonra tamamen silme
- **Notification:** DPO'ya silme raporu

## İstisna yönetimi

Bazı durumlarda silme yapılmaz:
- **Legal hold:** Devam eden dava süresince
- **İdari soruşturma:** Sonuçlanana kadar
- **Sözleşme zorunluluğu:** Müşteri kontratı gereği
- **Yasal saklama:** Minimum süre dolmadıysa

## Silme prosedürü

1. **Planla:** Silme kayıtları aylık çıktı
2. **Doğrula:** İstisna kontrolü
3. **Uygula:** Otomatik cron job
4. **Kayıt tutma:** Silme işleminin kanıtı
5. **Rapor:** Aylık DPO'ya

## Fiziksel belge

Bazı belgeler (imzalı sözleşme) fiziksel arşivde:
- Kilitli dolap
- Erişim log
- Yangın + su korunumu
- Yıllık envanter

## Alt işleyici silme

UpCore alt işleyicileri kullanıyorsa (örn. AWS S3):
- Sözleşmede silme yükümlülüğü
- Alt işleyici silme onay kayıtları
- Kısmi silme desteklemeyen hizmet kullanmayın

## Ayrılış sonrası

Çalışan ayrıldıktan sonra:
- 30 gün within: Veri indirme hakkı (Madde 11/a)
- 30 gün sonrası: Saklama politikasına geçer
- 5-10 yıl: Zorunlu saklama
- Sonrası: Anonimleştirme veya silme

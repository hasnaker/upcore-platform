---
id: anonimlik-guvencesi
title: Anonimlik güvencesi
sidebar_position: 3
---

# Anonimlik güvencesi

UpCore'un pulse sistemi tasarım gereği (privacy by design) bireysel cevapları korur.

## Teknik önlemler

1. **k-anonimlik eşiği**
   - Minimum 5 cevap eşiği her agrega görüntüsü için zorlanır
   - Departman < 5 kişiyse **üst bölüm** agregasına düşer

2. **Gürültü ekleme (differential privacy)**
   - Küçük gruplarda ±1 standart sapma rastgele gürültü eklenir
   - Büyük resmi bozmaz, bireyi izlenemez yapar

3. **Ayırt edici özellik maskeleme**
   - Departman + cinsiyet + yaş aralığı kombinasyonu 5'ten azsa agrega göster**me**
   - "Tek IT müdürü kadın" senaryosunu engeller

## Hukuki çerçeve

- KVKK Madde 5/2-(e): "ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için zorunlu" gerekçesi altında işlenir
- 7 yıl sonra TCKN bağı koparılır, araştırma amaçlı anonim arşiv kalır

## Bağımsız denetim

- Yıllık **algoritmik denetim** yayımlanır ([Bias denetim raporu](/docs/ik/modul/analitik/bias-denetimi))
- Pentest raporu özeti public olarak paylaşılır

:::tip
Şüpheniz varsa **KVKK Madde 11/a** kapsamında "benim verilerim işleniyor mu?" sorusunu sorma hakkınız vardır. İlgili portal: `app.upcore.io/kvkk`
:::

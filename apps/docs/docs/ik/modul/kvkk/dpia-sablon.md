---
id: dpia-sablon
title: "DPIA (Veri Koruma Etki Değerlendirmesi)"
sidebar_position: 6
---

# DPIA (Veri Koruma Etki Değerlendirmesi)

Yüksek riskli veri işleme faaliyetleri için **öncesinde** zorunlu değerlendirme.

## Ne zaman DPIA gerekli?

KVK Kurulu kararları ve GDPR'de yer alan senaryolar:
- Sistematik ve kapsamlı otomatik değerlendirme (ML modelleri)
- Özel nitelikli verilerin büyük ölçekte işlenmesi
- Sistematik izleme (biyometrik, video)
- Savunmasız veri sahipleri (çocuklar, hastalar, çalışanlar)
- Yeni teknoloji kullanımı (AI, IoT, blockchain)
- Yurt dışı aktarım

## UpCore'da DPIA gereken 3 kategori

### 1. Tükenmişlik tahmin modeli (ML)

- **Veri:** Pulse cevapları + özlük + performans + iletişim agregası
- **Amaç:** 90 gün içinde yüksek risk çalışan tahmin
- **Risk:** Çalışan üzerinde olumsuz etki (ayrımcılık riski)
- **Önlem:** Bias denetim, insan onay zorunlu, itiraz hakkı

### 2. Biyometrik giriş-çıkış (PDS)

- **Veri:** Parmak izi veya yüz tanıma
- **Amaç:** Fiziksel güvenlik + mesai takibi
- **Risk:** Veri sızıntısı → sahtecilik (biyometrik değiştirilemez)
- **Önlem:** Template değil hash, local processing, çalışan iznine göre alternatif

### 3. Sağlık verisi işleme (müdahale)

- **Veri:** BAT-TR skorları, psikolog referansları
- **Amaç:** Müdahale önerisi + etki ölçümü
- **Risk:** Stigma, KVKK ihlal
- **Önlem:** Açık rıza, sağlayıcı gizliliği, k-anonimlik

## DPIA içeriği (md. 6/4'e uygun)

1. **İşlemenin tanımı** — veriler, amaç, akışlar
2. **Hukuki sebep** — md. 5 veya 6
3. **Orantılılık + gereklilik değerlendirmesi**
4. **Risk analizi** — potansiyel zararlar
5. **Önlemler** — risk azaltıcı teknik + idari
6. **Artık risk** — önlemler sonrası
7. **Kararlar ve gerekçe**

## UpCore DPIA şablonları

Her 3 kategori için önceden hazırlanmış DPIA şablonu:
- Örnek değerlendirmeler
- Yaygın risk listesi
- Önerilen önlemler
- Tescil süreci (KVK Kurulu'na bildirim)

## Güncelleme

DPIA yapılan işleme değişirse:
- Yeni amaç, yeni veri türü → yeniden değerlendirme
- Yıllık gözden geçirme (zorunlu değil, iyi uygulama)
- Major sürüm değişiklikleri

## Dokümantasyon

Her DPIA için:
- PDF belge (imzalı, tarihli)
- Audit log'a kayıt
- VERBIS'e bağlantı (kategorilerle)
- İK + DPO + üst yönetim onay imzası

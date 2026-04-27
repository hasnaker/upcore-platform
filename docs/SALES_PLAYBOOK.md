# UpCore Sales Playbook

> UpCore satış ekibi için 30 dakikalık demo akışı, itiraz senaryoları, 3 segment için fiyat teklif yapısı ve kapanış stratejisi.

---

## 🎯 Hedef Müşteri Segmentleri

### A. Kamu / Belediye (2K-50K çalışan)
- **Karar verici:** İK Daire Başkanı, Genel Sekreter Yardımcısı
- **Bütçe döngüsü:** Yıllık (Ocak-Mart arası karar)
- **Satın alma süreci:** 4857 sayılı KIK uyumlu — ihale veya doğrudan temin
- **Tipik aylık ücret:** ₺50.000 - ₺200.000
- **Pilot müşteri hedef:** Samsun Büyükşehir Belediyesi, Ankara BB, İstanbul BB

### B. Holding / 4000+ (özel sektör)
- **Karar verici:** CHRO, İK Direktörü
- **Bütçe:** CHRO stratejik yatırım kalemi
- **Satın alma süreci:** Vendor evaluation → POC → sözleşme (3-6 ay)
- **Tipik aylık ücret:** ₺20.000 - ₺100.000
- **Hedef:** Koç, Sabancı, Turkcell, Arçelik, Eczacıbaşı

### C. Yüksek Başvuru Şirketi (300K+ başvuru/yıl)
- **Karar verici:** Talent Acquisition Direktörü
- **Bütçe:** İşe alım operasyon + kalite bütçesi
- **Satın alma süreci:** ATS lisansından bütçe dönüşümü
- **Tipik aylık ücret:** ₺80.000 - ₺250.000 (başvuru hacmine göre)

---

## 📞 İlk Görüşme: 30 Dakikalık Demo Akışı

### Dakika 0-3: Icebreaker + Hedef Netleştirme
- "Bugün özellikle ne çözmeyi umuyorsunuz?" (discovery)
- Sektör + çalışan sayısı + mevcut İK aracı
- **En önemli 3 ağrı noktasını not et** — demo buna göre özelleşir

### Dakika 3-10: Tükenmişlik Demo (FLAGSHIP)
1. `/tukenmislik` sayfası aç — Demo Holding A.Ş. verisiyle
2. **Heatmap**: "Üretim ekibi 4 haftadır kırmızıda — kimse size söylemedi çünkü pulse yoktu."
3. **Kritik çalışan tablosu**: "Burak Arslan BAT 3.8 — istifa %75 olasılık."
4. **Koçluk öner** → müdahale modal → evidence tier (A-tier d=0.51)
5. **Kapanış**: "Bu skorları sizin şirketinizde 2 hafta içinde görebilirsiniz."

### Dakika 10-18: Segment-Spesifik Derinlik
**A (Kamu):** `/cozumler/belediye` → 657/4B/4857, SGK entegrasyonu
**B (Holding):** `/cozumler/holding` → multi-entity CHRO dashboard, SAP %40 tasarruf
**C (ATS):** `/cozumler/ats` → Kariyer.net feed, CV parsing, adverse impact

### Dakika 18-25: Bilimsel Temel + KVKK
- `/bilimsel-temel` → 7 peer-reviewed ölçek
- "Mind Garden PCQ yıllık lisansı $X, biz UpCap-TR ile tamamen telif ücretsiz."
- KVKK: Azure TR region, AES-256, 7 yıl audit log, ISO 27001 roadmap

### Dakika 25-30: Fiyat + Next Steps
- Segment fiyat aralığı (yuvarlak rakam)
- **14 gün pilot teklifi** — "Kendi verilerinizle test edin, beğenmezseniz silinir"
- Takvim: haftaya teklif + sözleşme müzakeresi

---

## 💬 Top 10 İtiraz & Yanıt

### 1. "SAP SuccessFactors zaten var, neden sizi alalım?"
> SAP SF bordro + özlük. UpCore bunun üstünde — tükenmişlik pulse + JD-R fit + müdahale. Birbirini değiştirmez, tamamlar. SAP'ten çalışan listesini çekeriz, skor + risk verilerini geri yazarız. Hesap: SF lisansı $X/kişi/yıl, UpCore ek $Y/kişi/yıl ama turnover maliyeti %45 düşüyor.

### 2. "Anonim pulse çalışanlar tarafından güvenilecek mi?"
> Min N=5 kuralı var — 5'ten az yanıttaki departman ortalaması gösterilmez. IP loglanmaz. Clerk ile sadece giriş tutulur, yanıt employee_id ile eşleşmez (anonymized_survey_responses tablosu). İlk rollout'ta çalışanlara 1-sayfa aydınlatma metni ile tanıtılır — katılım %60-75 bekliyoruz (benchmark yıllık anket %35).

### 3. "KVKK riski var mı?"
> Azure TR region (İstanbul datacenter), AES-256 at-rest, TLS 1.3 transit. TCKN pgcrypto ile field-level encrypted. Audit log immutable 7 yıl. KVKK 11. madde hakları 30 gün içinde yanıtlanıyor (kvkk@upcore.app). ISO 27001 roadmap 2026 Q4. Pentest 2026 Q3 planlı. Sözleşmede veri işleyici taahhüt belgesi var.

### 4. "Psikometri bilimsel mi yoksa moda mı?"
> 7 peer-reviewed ölçek: BAT-12-TR (Koçak 2022, Work & Stress dergisi), JD-R modeli (Demerouti 2001, 20+ meta-analiz), UWES-9 (Schaufeli 2006), COPSOQ (Şahan 2019), VIA (Peterson 2004). Mind Garden PCQ telif bağımlılığı yok — UpCap-TR CC-BY 4.0. Norm değerleri European norms (Koçak 2022 n=2800).

### 5. "Kariyer.net / LinkedIn entegre mi?"
> Kariyer.net XML feed canlı (günlük senkron). LinkedIn Jobs API beta — Partner onayı var, başvuru sürecini biz yönetiriz. 2-hafta entegrasyon sözü.

### 6. "Fiyat yüksek / rakiplerden pahalı."
> Pazarı iki parçada karşılaştırın: (1) "Bordro + izin" araçları ₺3-10K/ay ama UpCore'un fonksiyonu değil. (2) SAP SF + Mind Garden + CEB = ₺300K+/ay. UpCore bu iki uçtan farklı: psikometri + JD-R + müdahale tek platform. Turnover maliyeti hesabı: 1 istifa = 6 aylık maaş. UpCore yılda 10 istifayı önlerse = ₺1-2M tasarruf. Aylık ₺50K ücret 25x ROI.

### 7. "Pilot nasıl çalışıyor?"
> 14 gün ücretsiz pilot. 1 departmanla başlarız (tipik 50-200 kişi). Pulse gönderilir, ilk hafta sonuçlar görünür. Beğenmezseniz sözleşme yok, veriler 30 gün içinde silinir ve ispat belgesi verilir (KVKK uyum). Beğenirseniz direkt prod sözleşmeye geçeriz.

### 8. "Entegrasyon ne kadar sürer?"
> Standart setup 6 hafta. Pilot 2 haftada başlar (tek departman, sadece BAT pulse). SAP/Logo/Paraşüt için REST API + webhook hazır. Özel entegrasyon gerekirse kendi ekibiniz 1-2 gün içinde OpenAPI 3.1 spec ile bağlantı kurabilir.

### 9. "Çalışanlar başvuruyu red ederse?"
> İlk 2 hafta çalışan tarafı rollout (CEO mesajı + KVKK aydınlatma + anonymous olacağı taahhüdü) şart. Benchmark: İK Departmanı kendi liderliğinde başlatırsa katılım %70+. Yönetim "zorla" girerse düşer. Bizim satış + uygulama ekibi bu rollout'u beraber planlar.

### 10. "Destek / SLA nedir?"
> %99.5 aylık uptime (Azure Container Apps). Kritik bug (P0) 4 saat response, 24 saat fix. Sözleşmeye destek seviyesi (business hours vs 7/24) dahil. Dedicated Customer Success Manager aylık review toplantısı.

---

## 💰 Fiyat Teklif Yapısı

### A. Kamu / Belediye
- **Baz**: 3 modül (Sürdürme + Koruma + Çalışanlar CRUD)
- **Fiyat**: Kişi başı aylık ₺8-15
- **12K çalışan için**: ~₺120K/ay
- **İlave**: SGK entegrasyon kurulum ₺50K tek seferlik
- **Sözleşme**: 12 ay minimum, 6 ay iptal ihbarı

### B. Holding / 4000+
- **Baz**: 5 modül full paket
- **Fiyat**: Tier'lı — 0-2K çalışan ₺30K, 2K-5K ₺60K, 5K+ ₺100K/ay
- **İlave**: Multi-entity consolidation +₺20K, executive dashboard +₺10K
- **SAP/Logo entegrasyon**: ₺30K tek seferlik

### C. Yüksek Başvuru (ATS)
- **Baz**: ATS + Kazanım modülü + bulk psikometrik
- **Fiyat**: Başvuru bazlı — 100K başvuru/yıl için ₺80K/ay, 300K+ için ₺200K/ay
- **İlave**: Kariyer.net + LinkedIn entegrasyon ücretsiz, custom CV parsing ₺40K tek seferlik

---

## 🏆 Kapanış Stratejisi

### Yeşil Bayraklar (kapanma sinyali)
- "Ne zaman başlayabiliriz?" / "Sözleşmede X maddesi olacak mı?"
- Teknik ekipten soru geliyor (CISO, IT Security)
- Referans talep ediliyor ("benzer segmentten kim kullanıyor?")
- 2. toplantı istiyorlar — board'a sunum olacak

### Kapanış Adımları
1. **24 saat içinde özel teklif PDF** (segment'e göre önceden hazır şablondan)
2. **Referans görüşme** ayarla (Samsun BB pilot, vs)
3. **Sözleşme müzakeresi** — standart MSA + KVKK ekleri
4. **Pilot başlama tarihi** kilitle (ödeme + kurulum fatura)
5. **Customer Success Manager** ilk hafta kick-off

### Kaybedilen Satış Analizi (Post-Mortem)
- Her lost deal için 1-sayfa doc: kaybediş sebebi, rakip (kim kazandı), fiyat farkı, özellik gap'i
- Quarterly retrospective: playbook güncellenir, satış ekibi paylaşılır

---

## 📧 E-posta Şablonları

### İlk Temas (Cold Outreach)
```
Konu: Kamu/Holding İK'da tükenmişliği önceden görmek

Merhaba [Ad],

[Şirket]'in ~[N] çalışanıyla İK operasyonunda 2026 önceliklerinizin
ne olduğunu düşünüyorum — özellikle çalışan tükenmişliği ve
iç mobilite gibi.

UpCore, Türkiye'nin ilk bilim-temelli İK platformu. BAT-12-TR ile
tükenmişliği 4-8 hafta önceden görüyoruz, JD-R modeliyle
müdahale öneriyoruz. Samsun BB pilot çalışmasında zabıta
ekibinde BAT skorunu 2.9 → 2.2'e indirdik.

30 dakikalık canlı demo için gelecek hafta 10 dk'lık ön
görüşmeye açık mısınız?

Saygılar,
[Satış Temsilcisi]
```

### Follow-up (Demo Sonrası)
```
Konu: UpCore demo özeti + teklif

Merhaba [Ad],

Bugünkü görüşmemiz için teşekkürler. Konuşmamızın özeti:

• Hedef: [çalışan tükenmişliği + ATS filtreleme / segment-specific]
• Önerdiğimiz 3 modül: [Sürdürme, Koruma, Kazanım]
• Aylık fiyat: ~₺[N]K
• Pilot: 14 gün ücretsiz, 1 departmanla başlar

Ek olarak:
— Segment özel teklif PDF'i (attach)
— Samsun BB referans görüşme (bu hafta içinde ayarlayabilirim)
— KVKK + güvenlik whitepaper (attach)

Önümüzdeki adım: teknik değerlendirme toplantısı için
takviminizi inceledim. [Tarih] 14:00-15:00 uygun mu?

Saygılar,
[Satış Temsilcisi]
```

---

## 🎬 Loom Demo Video Scripti (5 dk)

**[0:00-0:30]** Açılış — "Merhaba, ben [Ad], UpCore'dan. Size 5 dakikada Türkiye'nin ilk bilim-temelli İK platformunu göstereceğim."

**[0:30-1:30]** Panel — Action Center (günün 5 aksiyonu)

**[1:30-2:30]** Tükenmişlik modülü — heatmap + kritik çalışanlar

**[2:30-3:30]** Bir çalışanın detay tab'ı — BAT breakdown + JD-R + 90 gün trend

**[3:30-4:00]** Koçluk öner modal — evidence-based müdahale seçimi

**[4:00-4:30]** Bilimsel temel + KVKK

**[4:30-5:00]** Kapanış — "14 gün pilot için upcore.app/demo."

---

## 🔗 Kritik Materyal Linkleri

- Pricing PDF: `docs/PRICING_GUIDE.md`
- Security whitepaper: `docs/SECURITY_WHITEPAPER.md`
- SOC 2 gap analysis: `docs/SOC2_GAP_ANALYSIS.md`
- Samsun BB case study: `https://upcore.app/musteriler`
- Demo seed: `database/seeds/010_demo_holding.sql`

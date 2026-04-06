# UPCORE · UX Derinlik Spec
## Kural: Basit Kullanım, Derin İçerik

> "Kullanıcı 3 buton görür. Arkasında 6 bilimsel çerçeve, 77 tablo, 4 ML model çalışır."

---

## TEMEL PRENSIP

| Katman | Kullanıcı Görür | Arka Planda Çalışır |
|---|---|---|
| **Yüzey** | 3-5 aksiyon kartı | Priority scoring (urgency × impact × actionability) |
| **1 tık derinlik** | "Neden öneriyoruz" 3 cümle | JD-R balance + benzer vaka analizi + literatür |
| **2 tık derinlik** | Çalışan detay profili | BAT-12-TR skoru + PsyCap + tenure + event history |
| **Asla görmez** | — | LSTM model, Thompson sampling, pgvector similarity |

---

## MODÜL 1: KAZANIM (Recruitment)

### Kullanıcı Deneyimi (Basit)

```
HR Direktörü görür:
┌─────────────────────────────────────────┐
│ 📋 Açık Pozisyonlar                     │
│                                         │
│ ┌─ Satış Uzmanı ──────────── 12 aday ─┐│
│ │ ██████████░░░░░░ 4 değerlendirildi   ││
│ └──────────────────────────────────────┘│
│ ┌─ Backend Developer ─────── 8 aday ──┐│
│ │ ████░░░░░░░░░░░░ 2 değerlendirildi  ││
│ └──────────────────────────────────────┘│
│                                         │
│ [+ Yeni Pozisyon]                       │
└─────────────────────────────────────────┘

Pozisyona tıklayınca:
┌─────────────────────────────────────────┐
│ Satış Uzmanı · Pipeline                 │
│                                         │
│ Başvurdu(5) → Tarandı(3) → Test(2) →   │
│ Mülakat(1) → Teklif(1) → İşe Alım(0)  │
│                                         │
│ En Uygun Adaylar:                       │
│ 🟢 Selin Ö. %96 uyum  [Mülakata Al →]  │
│ 🟢 Kerem A. %95 uyum  [Mülakata Al →]  │
│ 🟡 Deniz K. %72 uyum  [Detay →]        │
└─────────────────────────────────────────┘
```

### Arka Planda (Derin)
- Aday CV'si parse edildi (NLP entity extraction)
- Big Five + PsyCap test yapıldı (50+ soru)
- JD-R fit hesaplandı (12 boyut cosine similarity)
- Erken ayrılma riski hesaplandı (XGBoost, 6 ay horizon)
- Bias audit yapıldı (gender/age adverse impact 4/5ths rule)
- Benzer profilli eski çalışanlarla karşılaştırıldı
- Rapor PDF oluşturuldu (8 sayfa, Turkish)

### UX Kuralı
- Aday kartında SADECE: isim, uyum %, durum badge
- 1 tıkla: detay profil + assessment sonuçları
- 2 tıkla: tam rapor PDF
- HR hiçbir zaman "cosine similarity" veya "XGBoost" görmez
- HR görür: "%96 uyum — güçlü iletişim, satış deneyimi uyumlu"

---

## MODÜL 2: SÜRDÜRME (Burnout)

### Kullanıcı Deneyimi (Basit)

```
HR Direktörü /tukenmislik sayfasını açar:
┌─────────────────────────────────────────┐
│ 🌡️ Tükenmişlik Görünümü                │
│                                         │
│ ┌──────┬──────┬──────┬──────┬────────┐  │
│ │      │ Hf 1 │ Hf 2 │ Hf 3 │ Güncel │  │
│ ├──────┼──────┼──────┼──────┼────────┤  │
│ │Satış │  🟡  │  🟠  │  🔴  │  52%   │  │
│ │MüşHiz│  🟡  │  🟠  │  🟠  │  47%   │  │
│ │Ürün  │  🟢  │  🟡  │  🟠  │  38%   │  │
│ │Mühen.│  🟢  │  🟢  │  🟡  │  19%   │  │
│ │Paz.  │  🟢  │  🟢  │  🟢  │  15%   │  │
│ │İK    │  🟠  │  🟡  │  🟢  │  24%   │  │
│ └──────┴──────┴──────┴──────┴────────┘  │
│                                         │
│ ⚠️ 3 kişi kritik bölgede               │
│                                         │
│ Mehmet K. Satış  52% ↑ [Koçluk Öner →] │
│ Ayşe Y.  MüşHiz 48% ↑ [Koçluk Öner →] │
│ Elif Ş.  Satış  45% → [İncele →]       │
└─────────────────────────────────────────┘
```

### "Koçluk Öner" tıklandığında (1 tık derinlik)
```
┌─────────────────────────────────────────┐
│ Mehmet Kaya · Koçluk Önerisi            │
│                                         │
│ ┌─ Neden? ────────────────────────────┐ │
│ │ 1. JD-R dengesi bozuk               │ │
│ │    Talep %78, Kaynak %56            │ │
│ │                                     │ │
│ │ 2. 3 haftalık yükseliş trendi       │ │
│ │    28% → 35% → 42% → 52%           │ │
│ │                                     │ │
│ │ 3. Benzer vakalar:                  │ │
│ │    8 benzer profil → 6'sı istifa    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Önerilen: Haftalık 1:1 + iş yükü azalt │
│ Tahmini etki: %52 → %28 (benzer vakalar)│
│                                         │
│ [Onayla ✓]  [Reddet ✗]  [Sonra ◷]      │
└─────────────────────────────────────────┘
```

### Arka Planda (Derin — kullanıcı ASLA görmez)
- BAT-12-TR 4 subscale scoring (Koçak 2022 formülü)
- COPSOQ-III-TR JD-R 13 subscale (Şahan 2019)
- JD-R balance index (Crawford 2010 meta-analytic β weights)
- Burnout probability = σ(0.42×demands - 0.35×resources - 0.05×interaction)
- Mann-Kendall trend testi (3 hafta monotonic artış)
- Thompson Sampling müdahale seçimi (Beta-Binomial posterior)
- pgvector embedding similarity (benzer çalışan profili bulma)
- Case-based reasoning (geçmiş müdahale sonuçları)
- Cohen's d effect size tahmini
- Provisional European norms (Schaufeli 2023) + Turkish norm disclaimer

### UX Kuralı
- Heatmap'te SADECE renk + yüzde
- Hover'da: "Satış, Hafta 3: %52, 24 çalışan, 4 kırmızı"
- Tıkla: departman detay (ortalama + en riskli 5 kişi)
- "Koçluk Öner" tıkla: 3 cümle gerekçe + tahmini etki + onayla butonu
- HR hiçbir zaman "LSTM", "Thompson Sampling", "pgvector" görmez

---

## MODÜL 3: AKSİYON MERKEZİ (Action Center)

### Kullanıcı Deneyimi (Basit)

```
HR Direktörü sabah /panel açar:
┌─────────────────────────────────────────┐
│ Günaydın, Ayşe                          │
│ Bugün 3 aksiyon bekliyor                │
│                                         │
│ ┌─ 🔴 Mehmet Kaya risk altında ───────┐ │
│ │ BAT-12 skoru 3 haftadır yükseliyor.  │ │
│ │ Koçluk görüşmesi öneriliyor.        │ │
│ │                           [Onayla →] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ 🟠 Satış ekibi kötüleşiyor ───────┐ │
│ │ Departman ortalaması %34. 4 kişi     │ │
│ │ kırmızı bölgede.                    │ │
│ │                      [Planla →]      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ 🟣 2 aday %95+ uyum ──────────────┐ │
│ │ Assessment tamamlandı. Mülakata      │ │
│ │ hazır.                              │ │
│ │                      [İncele →]      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ─── Bu Hafta ──────────────────────     │
│ 12 aksiyon · 8 koçluk · 34 assessment  │
└─────────────────────────────────────────┘
```

### Arka Planda (Derin)
- Tüm burnout_signals tarandı → RED olanlar filtrelendi
- Tüm leave_requests tarandı → pending olanlar bulundu  
- Tüm assessment_results tarandı → completed + high-fit olanlar bulundu
- Priority skoru hesaplandı: urgency(0-1) × impact(0-1) × actionability(0-1) × user_relevance(0-1)
- Top 5 seçildi (Miller's cognitive load — max 5)
- Her aksiyon için Azure OpenAI GPT-4o ile 3 cümle Türkçe gerekçe üretildi
- PII maskelendi (LLM'e göndermeden önce "Mehmet K." → "M.K.")
- 30 dakika Redis cache
- Role-based filtering (HR Director vs Line Manager farklı aksiyonlar görür)

### UX Kuralı
- MAX 5 kart (daha fazla gösterme — cognitive overload)
- Her kart: 1 başlık + 2 satır açıklama + 1 buton
- "Detay" tıkla: 3 gerekçe + etki tahmini
- "Onayla" tıkla: kart kaybolur, sonraki gelir, müdahale otomatik atanır
- Hiçbir zaman "priority scoring formula" veya "LSTM" görünmez

---

## MODÜL 4: İZİN YÖNETİMİ

### Kullanıcı Deneyimi (Basit)

```
Çalışan /izinler açar:
┌─────────────────────────────────────────┐
│ 📅 İzinlerim                            │
│                                         │
│ Yıllık  ████████████░░░░░░  14/20 gün  │
│ Mazeret ████████░░░░░░░░░░  8/10 gün   │
│ Hastalık ∞                              │
│                                         │
│ [+ Yeni İzin Talebi]                    │
│                                         │
│ Son talepler:                           │
│ 15 Mar  Yıllık  3 gün  🟢 Onaylandı   │
│ 02 Şub  Mazeret 1 gün  🟢 Onaylandı   │
│ 10 Oca  Yıllık  5 gün  🟢 Onaylandı   │
└─────────────────────────────────────────┘

"Yeni İzin Talebi" tıklandığında:
┌─────────────────────────────────────────┐
│ Yeni İzin Talebi                        │
│                                         │
│ Tip:    [Yıllık İzin        ▾]         │
│ Başlangıç: [15/04/2026]               │
│ Bitiş:     [18/04/2026]               │
│ Neden: [                    ]           │
│                                         │
│ 📊 Bu tarihler: 4 iş günü              │
│ ⚠️ Ekipten 2 kişi zaten izinde         │
│ 💡 Kalan bakiye: 14 → 10 gün           │
│                                         │
│ [İptal]              [İstek Gönder →]   │
└─────────────────────────────────────────┘
```

### Arka Planda (Derin)
- 4857 İş Kanunu Madde 53: kıdem bazlı yıllık izin (14/20/26)
- 18 yaş altı ve 50+ yaş: minimum 20 gün
- Resmi tatil hesaplama (Ramazan/Kurban bayramı Diyanet takvimine göre)
- İş günü hesaplama (hafta sonu + resmi tatil çıkarılır)
- Carry-over cap: 2× yıllık hak
- Overlap check: aynı tarihte aynı departmandan >%30 izinli → uyarı
- Manager notification: otomatik email
- Onay akışı: pending → manager_approved → hr_approved → approved
- Hastalık izni: N gün üzeri → sağlık raporu zorunlu
- Bordro entegrasyonu: ücretsiz izin → maaş kesintisi

### UX Kuralı
- Çalışan SADECE 3 şey görür: bakiye, form, geçmiş
- İş günü sayısı OTOMATİK hesaplanır (tarih seçince)
- Ekip çakışma UYARISI otomatik gösterilir
- Onay süreci GÖRÜNMEZ ilerler (çalışan sadece sonucu görür)

---

## MODÜL 5: BELGE YÖNETİMİ

### Kullanıcı Deneyimi (Basit)
- Belge listesi (kart grid, filtre chips)
- Sürükle-bırak upload
- 1 tık download (signed URL)
- Süresi dolan belgeler: kırmızı badge

### Arka Planda (Derin)
- Azure Blob Storage (encrypted at rest)
- SAS URL (15 dk expiry, HTTPS-only)
- SHA-256 checksum (upload integrity)
- Versioning (aynı belgenin farklı versiyonları)
- KVKK retention: sözleşme 7 yıl, sağlık 10 yıl, otomatik silme
- MIME validation (PDF/DOCX/XLSX/JPG/PNG only)
- Virus scan hook (V2)
- Audit: her download loglanır

---

## GENEL UX KURALLARI

### Cognitive Load Minimum
1. Ana ekranda MAX 5 aksiyon (Miller's Law)
2. Her sayfada MAX 3 ana bölüm
3. Detay her zaman 1 tık uzakta (progressive disclosure)
4. Bilimsel terimler ASLA UI'da görünmez
5. Türkçe, sade, net cümleler

### Progressive Disclosure Hiyerarşisi
```
Seviye 0: Dashboard         → 3-5 aksiyon kartı
Seviye 1: Kart tıkla        → Gerekçe + öneri
Seviye 2: "Detay" tıkla     → Çalışan profili + skorlar
Seviye 3: "Rapor" tıkla     → Tam PDF rapor
Seviye 4: Admin panel        → Raw data, API logs, model cards
```

### Renk Sistemi (Semantic)
- 🟢 Green (#059669): İyi, onaylandı, düşük risk
- 🟡 Amber (#D97706): Dikkat, bekliyor, orta risk
- 🔴 Red (#DC2626): Kritik, reddedildi, yüksek risk
- 🟣 Violet (#5E5CE6): Accent, fırsat, bilgi, CTA
- ⚫ Black (#111): Primary text, primary button
- ⚪ Gray (#888): Secondary text, muted

### Feedback Pattern
- Buton tıkla → 150ms sonra state değişir
- Form submit → loading spinner → success toast / error inline
- Delete → confirm modal → soft delete → undo toast (5 sn)
- Toggle → instant visual change + background save

### Empty State Pattern
Her sayfanın boş hali:
- İkon (outline, 40px)
- Başlık: "Henüz [X] eklenmemiş"
- CTA: "İlk [X]'inizi ekleyin →"
- ASLA boş beyaz sayfa gösterme

### Error Pattern
- API hatası: "Bir şeyler ters gitti. Tekrar deneyin."
- Validation: inline field-level error (kırmızı border + mesaj)
- 404: "Bu sayfa bulunamadı" + ana sayfaya link
- Network: "İnternet bağlantınızı kontrol edin" banner

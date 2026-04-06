# UPCORE · Derin Modül Spec
## Asena'nın Orijinal Vizyonu + Enterprise Derinlik

Bu doküman her modülün gerçek derinliğini tanımlar. "Basit liste sayfası" değil, 
SAP/Workday kalitesinde enterprise özellikler.

---

## MODÜL 1: KAZANIM (Recruitment + Assessment)

### 1.1 Başvuru Yönetimi
- **Çok kanallı toplama:** Kariyer.net XML feed, LinkedIn API, website portal, bulk CSV
- **Otomatik parsing:** CV'den (PDF/DOCX) → ad, soyad, email, telefon, deneyim, beceriler (NLP)
- **Duplikasyon tespiti:** Aynı kişi farklı kanaldan geldi mi? Email + TCKN matching
- **KVKK onayı:** İlk başvuruda açık rıza formu, 6 ay saklama süresi

### 1.2 ATS Pipeline
- **Kanban:** 8 aşama (Başvurdu → CV Tarandı → Ön Görüşme → Psikometrik Test → Teknik Mülakat → HR Mülakat → Teklif → İşe Alım)
- **Aşama kuralları:** "Psikometrik testten geçmeden mülakata alınmaz" gibi zorunlu geçiş kuralları
- **SLA takibi:** Her aşamada max bekleme süresi (ör: CV tarama max 3 gün)
- **Otomatik red:** 30 gün hareketsiz → otomatik red + bildirim
- **Mülakat planlama:** Takvim entegrasyonu, mülakatçı atama, feedback formu

### 1.3 Psikometrik Assessment
- **Test battery:** BAT-12-TR + Big Five (IPIP-50-TR) + Cognitive Ability + Role-specific
- **Anti-cheating:** Tab switch detection, time-per-question tracking, browser fingerprint, IP logging
- **Adaptive testing:** Doğru cevaplara göre sonraki soruların zorluğu ayarlanır
- **Bias audit:** Gender/age bazlı adverse impact analizi (4/5ths rule)
- **Blind review:** Demografik bilgiler skorlama sırasında gizli

### 1.4 JD-R Fit Scoring
- **Pozisyon profili:** Her pozisyon için 6 talep + 6 kaynak skoru (1-10)
- **Aday profili:** Assessment sonuçlarından otomatik hesaplanan 12 boyut
- **Fit algoritması:** Weighted cosine similarity + asymmetric penalty (fazla kapasite ≠ az kapasite)
- **Output:** Fit skoru (0-100), risk analizi, mülakat önerileri, development gap'ler
- **Erken ayrılma tahmini:** 6 ay içinde ayrılma olasılığı (XGBoost model)

### 1.5 Rapor Üretimi
- **Manager özet (2 sayfa):** Genel fit, güçlü yönler, dikkat edilecekler, mülakat soruları
- **Tam rapor (8 sayfa):** Detaylı trait skorları, norm karşılaştırma, JD-R analizi
- **Aday feedback:** Şeffaf, güçlendirici ton, gelişim önerileri
- **PDF watermark + güvenli link (15 dk expiry)**

---

## MODÜL 2: SÜRDÜRME (Burnout + Engagement)

### 2.1 Pulse Survey Engine
- **BAT-12-TR:** Haftalık 12 soru, 1 dakika, Koçak 2022 validated
- **COPSOQ-III-TR:** Aylık 24 soru, JD-R talep/kaynak ölçümü
- **Custom surveys:** HR kendi soru bankasını oluşturabilir
- **Adaptive:** Önceki cevaplara göre soru seçimi (40 soru bankasından 12 seçilir)
- **Anonim:** Min N=5, bireysel sonuç gösterilmez, IP loglanmaz
- **Hatırlatma:** 72 saat sonra otomatik reminder, max 3 kez
- **Skip logic:** Son 7 günde anket yapan çalışana tekrar gönderilmez

### 2.2 JD-R Scoring Engine
- **6 Talep boyutu:** İş yükü, bilişsel talep, duygusal talep, zaman baskısı, rol çatışması, rol belirsizliği
- **6 Kaynak boyutu:** Özerklik, geri bildirim, sosyal destek, gelişim fırsatı, beceri çeşitliliği, görev önemi
- **Denge indeksi:** Resources - Demands (normalize edilmiş)
- **Burnout olasılığı:** Logistic regression (Crawford 2010 meta-analytic β weights)
- **Departman heatmap:** 6×4 haftalık grid, materialized view, 15 dk refresh
- **Trend tespiti:** Mann-Kendall test, 3 hafta üst üste kötüleşme → alarm

### 2.3 Early Warning System
- **LSTM model (V2):** 30/60/90 gün burnout tahmini
- **V1 heuristic:** JD-R balance < -1.5 AND trend ↑ 3 hafta → RED alert
- **MC Dropout:** Confidence interval hesaplama
- **False positive minimization:** Precision > 0.7 hedefi
- **Alert kademeleri:** Watch (sarı) → Warning (turuncu) → Critical (kırmızı) → Crisis (mor)

### 2.4 Intervention Engine
- **20 evidence-based müdahale:** Coaching, workload redesign, autonomy expansion, CBT referral, vb.
- **Thompson Sampling:** Per-tenant Beta-Binomial posterior, explore/exploit balance
- **Matching:** Çalışanın JD-R profili + müdahale hedef alanı = uyum skoru
- **Consent workflow:** Sistem önerir → HR onaylar → çalışan kabul eder → uygula → ölç
- **Pre/post design:** Müdahale öncesi ve sonrası BAT-12-TR skoru karşılaştırma
- **Cohen's d effect size:** Müdahale etkinliği bilimsel ölçüm
- **Effectiveness learning:** Her sonuç posterior'u günceller → sistem zamanla akıllanır

### 2.5 eNPS (Employee Net Promoter Score)
- **Tek soru:** "Bu şirketi bir arkadaşınıza tavsiye eder misiniz?" (0-10)
- **Hesaplama:** (Promoters - Detractors) / Total × 100
- **Departman bazlı breakdown**
- **Trend takibi:** Aylık eNPS trendi

---

## MODÜL 3: GELİŞİM (Development + Strengths) — V2

### 3.1 Güçlü Yön Analizi
- **UpStrengths-TR:** Custom 24-item instrument (VIA taxonomy, Turkish validated)
- **8 domain:** Bilgelik, Cesaret, İnsanlık, Adalet, Ölçülülük, Aşkınlık + 2 custom
- **Top 5 güçlü yön:** Kişisel profil kartı
- **Shadow strengths (#6-10):** Gelişim potansiyeli
- **Rol-güçlü yön uyumu:** Position profile vs strength profile matching

### 3.2 Performans Yönetimi
- **OKR sistemi:** Şirket → Departman → Bireysel hedef kaskadı
- **Sürekli feedback:** Manager-employee 1:1 check-in'ler
- **360° değerlendirme:** Yönetici + peer + alt + öz değerlendirme
- **9-box matrix:** Performans × potansiyel grid, otomatik yerleştirme
- **Calibration sessions:** Departmanlar arası puanlama kalibrasyonu

### 3.3 IDP (Individual Development Plan)
- **AI-generated:** Güçlü yön + rol gap + kariyer hedefi → 6 aylık plan
- **70/20/10 modeli:** %70 iş başında, %20 mentoring, %10 eğitim
- **Goal tracking:** Haftalık check-in, manager onay
- **Resource önerileri:** Kitap, kurs, mentor eşleştirme

### 3.4 Kariyer Yolu
- **DAG (Directed Acyclic Graph):** Rol → olası sonraki roller
- **Readiness:** Ready now / 1 yıl / 2 yıl / 3 yıl
- **Skill gap analysis:** Hedef rol için eksik yetkinlikler
- **Succession planning:** Kritik roller için backup kişiler

---

## MODÜL 4: GEÇİŞ (Transition + Mobility) — V2

### 4.1 İç Mobilite
- **İç pozisyon ilanı:** Çalışanlara özel, 2 hafta iç öncelik
- **Gizli başvuru:** Mevcut yönetici teklif aşamasına kadar görmez
- **Job Crafting önerileri:** Task/relationship/cognitive crafting
- **Stretch assignment:** Geçici görevlendirme + gelişim amacı

### 4.2 Offboarding
- **Yapılandırılmış çıkış mülakatı:** Standart soru seti
- **Bilgi transferi checklist:** Proje devir, doküman, erişim
- **Erişim iptal otomasyonu:** Son gün tüm hesaplar kapatılır
- **Alumni ağı:** Eski çalışan ilişki yönetimi

---

## MODÜL 5: ANALİTİK (Intelligence Dashboard)

### 5.1 Executive Dashboard
- **CEO/Başkan paneli:** Tüm kurum tek bakışta
- **Birim sağlık skoru:** Tükenmişlik + bağlılık + turnover composite
- **Trend:** Ay/çeyrek/yıl karşılaştırma
- **Benchmark:** Sektör ortalamasıyla karşılaştırma

### 5.2 Predictive Analytics
- **Turnover tahmini:** 90 gün içinde ayrılma olasılığı
- **Burnout tahmini:** 30/60/90 gün LSTM
- **Hiring success:** İşe alım kalitesi (6 ay sonra hâlâ var mı?)
- **ROI of interventions:** Müdahale yatırım getirisi

### 5.3 Custom Reports
- **Rapor builder:** Drag & drop metrik seçimi
- **Scheduled reports:** Haftalık/aylık otomatik email
- **Export:** PDF, Excel, PowerBI connector

---

## MODÜL 6: YÖNETİŞİM (Governance + KVKK)

### 6.1 KVKK Compliance
- **Açık rıza yönetimi:** Consent flow, versiyon takibi, iptal
- **Veri saklama politikaları:** Tip bazlı otomatik silme (7/10 yıl)
- **VERBİS kaydı:** İşlem envanteri, otomatik güncelleme
- **Veri erişim loglama:** Kim, ne zaman, hangi veriye erişti
- **DSR (Data Subject Request):** Erişim/silme/düzeltme talepleri, 30 gün SLA

### 6.2 Audit Trail
- **İmmutable log:** Her değişiklik kaydedilir, silinemez
- **Partition:** Aylık partition, 7 yıl saklama
- **KVKK uyarıları:** Hassas veriye erişimde otomatik log

---

## V1 vs V2 vs V3 DELİNLİK HARİTASI

| Özellik | V1 (şu an) | V2 (3 ay sonra) | V3 (9 ay sonra) |
|---|---|---|---|
| Çalışan CRUD | ✅ E2E çalışıyor | + bulk import + search | + custom fields |
| Burnout pulse | ✅ BAT-12-TR cevapla + skorla | + COPSOQ + custom | + adaptive |
| JD-R scoring | ✅ Heuristic v0.1 | + calibrated model | + LSTM |
| Action Center | ⚠️ Static cards | + real ML scoring | + LLM reasoning |
| Heatmap | ⚠️ Static data | + real API | + drill-down |
| İzin yönetimi | ⚠️ Client-side | + real API + onay akışı | + takvim entegrasyon |
| Assessment | ⚠️ Kanban static | + real test delivery | + anti-cheating |
| Interventions | ⚠️ Button state | + real catalog + assign | + Thompson |
| Strengths | ❌ V2 | + UpStrengths-TR | + role matching |
| Mobility | ❌ V2 | + iç pozisyon | + job crafting |
| Analytics | ❌ V3 | executive dashboard | + predictive |
| KVKK | ⚠️ Basic | + consent flow | + DSR + VERBİS |

---

## SONRAKI SESSION İÇİN YÖNERGE

Her yeni session'da bu dökümanı oku. Sprint planı şu şekilde:

1. **Mevcut V1'i %100 çalışır yap** (tüm butonlar, formlar, API'lar)
2. **Her modülü derin yap** (assessment: gerçek test delivery, burnout: gerçek scoring API)
3. **E2E test** — `scripts/validate.sh` her şeyi test etsin
4. **Git commit + deploy** — Azure'a al
5. **5 design partner onboarding** — gerçek müşteri testi

Bu spec "facade" değil — her satır bir gerçek özellik, her özellik bir gerçek user flow.

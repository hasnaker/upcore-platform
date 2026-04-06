# UPCORE V1 · MEGA PLAN — Her Özellik Derinlemesine

## Dürüst Durum Raporu

### Nerede Olduğumuz

| Katman | Durum | Problem |
|---|---|---|
| **Database** | ✅ Gerçek | 77 tablo, RLS, seed data çalışıyor |
| **Go Backend** | ✅ Gerçek kod | Handler'lar, repo'lar, domain logic var. Compile oluyor. |
| **Python ML** | ⚠️ Yarı gerçek | Scoring algoritmaları var ama FastAPI routing eksik |
| **Frontend** | ❌ FACADE | 31 dosya mock data. Sadece 2 dosya gerçek API call. UI düzgün değil. |
| **Frontend ↔ Backend** | ❌ YOK | Hiçbir sayfa gerçek backend'e bağlı değil |
| **UX Felsefesi** | ❌ UYGULANMADI | Action-first, cognitive load minimal konsepti implement edilmedi |
| **Nordic Design** | ⚠️ Kısmen | Design tokens var ama sayfalar düzgün kullanmıyor |

### Temel Problem
1.313 dosya ürettik ama **frontend tamamen sahte**. Backend derlenip çalışabiliyor ama frontend ona hiç bağlanmıyor. Kullanıcı mock data görüyor.

---

## MEGA PLAN: 6 Faz, Özellik Özellik

### FELSEFİ KURAL
> "Her özellik ya TAM ÇALIŞIR ya da YOK. Yarım özellik = 0 özellik."

Her sayfada: gerçek API ↔ gerçek DB ↔ gerçek UI. Mock data kaldırılır.

---

## FAZ 0: ALTYAPI FIX (3 gün)

### 0.1 API Gateway çalışır hale getir
- **Ne:** api-gateway service'i localhost:8080'de ayağa kalk
- **Nasıl:** `go run cmd/main.go` → tüm downstream servisler routing
- **Test:** `curl http://localhost:8080/health` → 200
- **Gerekli:** Docker compose'da tüm Go servisleri de ekle

### 0.2 Auth flow end-to-end
- **Ne:** Clerk login → JWT → api-gateway → backend service'e auth header
- **Nasıl:** 
  - Clerk webhook → auth service → user DB'de
  - Frontend login → Clerk JWT → api-gateway JWT validation → tenant context
  - Her API call'da `Authorization: Bearer <token>` + `X-Tenant-Id: <uuid>`
- **Test:** Login yap → /panel'de kullanıcı adını gör

### 0.3 Frontend API client gerçek bağlantı
- **Ne:** @upcore/api-client'ı her sayfada kullan (mock data kaldır)
- **Nasıl:**
  - `useEmployees()` → `GET /api/v1/employees` → api-gateway → employee-service → PostgreSQL
  - Her hook gerçek backend'e bağlı
  - Loading/error/empty state'ler düzgün gösterilsin
- **Test:** /calisanlar sayfası DB'deki seed data'yı göstersin

### 0.4 Docker Compose tam stack
```yaml
services:
  postgres, redis, azurite, mailhog  (var)
  + auth-service (port 8001)
  + tenant-service (port 8002)
  + employee-service (port 8003)
  + organization-service (port 8004)
  + leave-service (port 8005)
  + document-service (port 8006)
  + survey-service (port 8007)
  + intervention-service (port 8008)
  + audit-service (port 8009)
  + notification-service (port 8010)
  + ats-service (port 8011)
  + assessment-service (port 8012)
  + api-gateway (port 8080)
  + psychometric-scoring (port 8021)
  + web (port 3000)
```
- `docker compose up` → tüm sistem ayağa kalksın

### 0.5 Design System proper fix
- Nordic Minimal tokens her sayfada tutarlı
- Tailwind config doğru extend etsin
- Inter font feature settings aktif
- Violet accent (#5E5CE6) tutarlı
- 8px border-radius, 1px border #EDEDED tutarlı
- Whitespace generous (48-64px section gaps)

---

## FAZ 1: PANEL — Action Center (5 gün)

**Bu sayfanın ürünün tamamını temsil etmesi gerekiyor.**

### 1.1 Ana Aksiyon Kartları (Heart of Upcore)
**Mevcut:** Mock 3 kart, statik veri
**Olması gereken:**
- Backend: action-center ML service → priority = urgency × impact × actionability × user_relevance
- API: `GET /api/v1/actions/top?limit=5` → max 5 aksiyon
- Her kart:
  - Urgency badge (Acil/Uyarı/Bilgi) + renk kodu
  - Başlık (1 satır, net)
  - Açıklama (2-3 satır, neden bu önemli)
  - Meta info (departman, kişi sayısı, süre)
  - CTA butonu ("Koçluk Öner →", "Müdahale Planla →", "İncele →")
  - "Detayları Gör" secondary link
- Sol kenarda renk stripe (kırmızı/amber/mor)
- Tıklayınca → Decision Flow sayfası açılır

### 1.2 Decision Flow (Onay Akışı)
**Mevcut:** Yok
**Olması gereken:**
- Sol panel: Çalışan özet kartı (foto, ad, departman, risk skoru, trend)
- Sağ panel: "Neden Öneriyoruz" — 3 gerekçe (JD-R, benzer vaka, literatür)
- Alt: 3 buton → Onayla / Reddet / Sonra
- API: `POST /api/v1/actions/{id}/approve` veya `/reject` veya `/defer`
- Onay sonrası → intervention assignment otomatik oluşsun
- Animation: kart onaylanınca fade out, sonraki kart slide in

### 1.3 "Bu Hafta Sen Ne Yaptın" Recap
**Mevcut:** Mock veriler
**Olması gereken:**
- API: `GET /api/v1/actions/recap?period=7d`
- 4 metrik: Tamamlanan aksiyon, Önerilen koçluk, Assessment yapılan, İç rotasyon
- Her metrik: sayı + geçen haftaya göre değişim (↑↓)
- Gerçek veriden hesaplanmış

### 1.4 Aktif Modüller Kartları
**Mevcut:** Mock statik liste
**Olması gereken:**
- API: `GET /api/v1/tenants/me/modules`
- Aktif modüller: canlı metrik göster (Assessment: 47 aday, Burnout: %23 risk, vb.)
- Kapalı modüller: %30 opacity, "Aktifleştir →" linki, fiyat göster
- Modül aktifleştirme → Stripe/Iyzico payment flow

---

## FAZ 2: ÇALIŞANLAR — Employee Management (5 gün)

### 2.1 Çalışan Listesi (DataTable)
**Mevcut:** Mock 10 satır, search çalışmıyor
**Olması gereken:**
- API: `GET /api/v1/employees?page=1&limit=20&search=&department=&status=`
- Gerçek DataTable:
  - Sıralanabilir kolonlar (ad, departman, pozisyon, başlama tarihi, durum)
  - Server-side pagination (100+ çalışan)
  - Full-text search (pg_trgm) — ad/soyad/email/sicil no'da
  - Departman filtresi (dropdown, API'dan)
  - Durum filtresi (Aktif/İzinde/Ayrılmış)
  - Satıra tıklayınca → /calisanlar/[id] detay sayfası
- Avatar: Gerçek foto veya initials badge
- Durum: StatusPill component (yeşil/sarı/kırmızı)
- Export: CSV export butonu

### 2.2 Çalışan Detay Sayfası
**Mevcut:** Skeleton placeholder
**Olması gereken:**
- API: `GET /api/v1/employees/{id}`
- Header: Foto + Ad Soyad + Departman + Pozisyon + Durum badge
- Tabs:
  - **Genel Bilgiler:** Kişisel (TCKN masked, doğum tarihi, telefon, email) + İş (sicil no, başlama tarihi, yönetici, departman)
  - **Tükenmişlik:** Son BAT-12-TR skoru, JD-R dengesi, 30 günlük trend (eğer Burnout modülü aktifse)
  - **Güçlü Yönler:** Top 5 strength (eğer Strengths modülü aktifse — V2)
  - **İzinler:** Bakiye + son talepler
  - **Belgeler:** Sözleşme, kimlik, sertifikalar
  - **Geçmiş:** Pozisyon değişiklikleri, terfi, departman değişimi timeline
- Edit butonu → çalışan düzenleme form
- Soft delete (Devre Dışı Bırak)

### 2.3 Çalışan Ekleme Formu
**Mevcut:** Basit form, validation yok
**Olması gereken:**
- API: `POST /api/v1/employees`
- react-hook-form + Zod validation (@upcore/types schemas)
- Alanlar: Ad*, Soyad*, Email*, TCKN (11 hane + doğrulama), Doğum Tarihi, Telefon, Departman (dropdown API'dan), Pozisyon (dropdown), Yönetici (employee search), Başlama Tarihi*, Sözleşme Tipi
- TCKN validation: mod 10/11 algoritması real-time
- Email unique kontrolü (blur'da API call)
- Başarılı kayıt → toast + redirect /calisanlar/[id]
- Hata → form field'da kırmızı border + hata mesajı (Türkçe)

### 2.4 Bulk CSV Import
**Mevcut:** Placeholder sayfa
**Olması gereken:**
- Drag & drop file upload area
- CSV format açıklaması (Paraşüt uyumlu)
- Örnek CSV indirme linki
- Upload → backend parse → validation → sonuç:
  - Başarılı: N çalışan eklendi
  - Hatalı: satır bazlı hata listesi (TCKN invalid, email duplicate, vb.)
- Progress bar (büyük dosyalar için)

### 2.5 Org Chart Visualization
**Mevcut:** Mock nested list
**Olması gereken:**
- API: `GET /api/v1/departments/tree`
- Gerçek ağaç görünümü (expandable/collapsible)
- Her düğüm: departman adı + çalışan sayısı + yönetici adı
- Tıklayınca → departman detay sidebar açılır
- Departman ekleme/düzenleme modal
- Sürükle-bırak ile departman taşıma (bonus — V1 için zorunlu değil)

---

## FAZ 3: TÜKENMİŞLİK — Burnout Module (7 gün)

**Bu modül Upcore'un diferansiyasyonu. EN İYİ yapılmalı.**

### 3.1 Burnout Dashboard (Ana Görünüm)
**Mevcut:** Mock heatmap
**Olması gereken:**
- API: `GET /api/v1/burnout/heatmap?weeks=4`
- **6 Departman × 4 Hafta Grid:**
  - Her hücre: renk kodlu (Green ≤2.58 / Amber 2.59-3.01 / Red ≥3.02)
  - Hover: tooltip ile exact skor + çalışan sayısı
  - Tıklayınca: departman detay açılır
- Sağ panel: Özet metrikler
  - Ortalama tükenmişlik: %X
  - Kırmızı bölgedeki çalışan: N kişi
  - Trend: ↑↓ geçen aya göre
  - Bağlılık endeksi: X/100

### 3.2 Kritik Çalışanlar Listesi
**Mevcut:** Mock 10 satır
**Olması gereken:**
- API: `GET /api/v1/burnout/critical?limit=10`
- DataTable: Ad, Departman, Pozisyon, Risk %, Trend (↑↓), Son check-in
- Her satırda: "Koçluk Öner" quick action butonu
- Tıklayınca → çalışan tükenmişlik detay sayfası
- Gerçek veriden: BAT-12-TR son puan + JD-R balance

### 3.3 Bireysel Tükenmişlik Detay (/tukenmislik/[id])
**Mevcut:** Yok
**Olması gereken:**
- API: `GET /api/v1/burnout/employee/{id}`
- Header: Çalışan bilgisi + genel risk badge
- **BAT-12-TR Breakdown:**
  - 4 subscale bar chart: Tükenmişlik, Zihinsel Uzaklaşma, Bilişsel Bozulma, Duygusal Bozulma
  - Her bar: skor + renk + European norm percentile
- **JD-R Dengesi:**
  - Sol: Talepler (iş yükü, zaman baskısı, duygusal yük, rol belirsizliği)
  - Sağ: Kaynaklar (özerklik, geri bildirim, sosyal destek, gelişim fırsatı)
  - Denge çubuğu: dengesizlik → kırmızı
- **30 Günlük Trend:** Line chart (haftalık BAT-12 puanları)
- **Önerilen Müdahaleler:** Action Center'dan öneriler
- **Müdahale Geçmişi:** Daha önce yapılan müdahaleler + sonuçları

### 3.4 Pulse Survey Flow (Çalışan Tarafı)
**Mevcut:** Mock BAT-12 listesi
**Olması gereken:**
- Çalışan email/bildirim alır → survey linkine tıklar
- 12 soru, her biri:
  - Türkçe soru metni (Koçak 2022 BAT-TR)
  - 5'li Likert scale (Hiçbir zaman → Her zaman) — radio button grubu
  - Mevcut cevap highlight edilir
  - İlerleme çubuğu (3/12 tamamlandı)
- Submit → psychometric-scoring service → skor hesaplama → DB kayıt
- Anonim: min N=5 olmadan sonuç gösterilmez
- "Teşekkürler" sayfası + skor özeti (bireysel)

### 3.5 Müdahale Atama Flow
**Mevcut:** Yok
**Olması gereken:**
- Kritik çalışan → "Koçluk Öner" tıkla
- Modal: Müdahale seçimi (20 evidence-based intervention listesi)
- Her müdahale: isim + açıklama + evidence tier (A/B/C) + tahmini süre
- "Öner" → çalışana consent email gider
- Çalışan kabul/reddet
- Kabul → müdahale başlar → outcome tracking

---

## FAZ 4: ANKETLER + DEĞERLENDİRMELER (5 gün)

### 4.1 Anket Yönetimi (HR View)
- Aktif anketler listesi + completion rate
- Yeni anket oluşturma (BAT-12-TR veya custom)
- Anket sonuçları: departman bazlı aggregation (min N=5)
- Export: CSV/PDF

### 4.2 ATS Pipeline (Kanban Board)
- Gerçek API: `GET /api/v1/ats/positions/{id}/board`
- Kanban: 6 kolon (Başvurdu → Tarandı → Değerlendirildi → Mülakata Alındı → Teklif → İşe Alındı)
- Drag & drop stage değiştirme
- Aday kartı: isim + assessment skoru + fit %

### 4.3 Assessment Delivery (Aday Portalı)
- Token-based link (JWT değil)
- BAT-12-TR / UpCap-TR test delivery
- Timer + anti-cheating (tab switch sayacı)
- Submit → scoring → rapor oluşturma

---

## FAZ 5: İZİNLER + BELGELER + AYARLAR (4 gün)

### 5.1 İzin Yönetimi
- İzin talebi formu (tip, tarih aralığı, neden)
- Bakiye gösterimi (yıllık/mazeret/hastalık)
- Onay akışı (manager → HR)
- Takvim görünümü

### 5.2 Belge Yönetimi
- Upload (drag & drop) → Azure Blob
- Versioning (aynı belgenin farklı versiyonları)
- Download (signed URL)
- KVKK uyumlu retention

### 5.3 Ayarlar
- Profil düzenleme
- Şirket ayarları (ad, logo, VKN)
- Modül açma/kapama
- Bildirim tercihleri
- Abonelik/fatura bilgileri

---

## FAZ 6: POLISH + PRODUCTION (5 gün)

### 6.1 Responsive Design
- Tüm sayfalar mobile-first
- Sidebar → hamburger menu (mobile)
- DataTable → card view (mobile)
- Touch-friendly butonlar (44px min)

### 6.2 Loading States
- Her sayfa: skeleton loading (not spinner)
- API call sırasında button disabled + spinner
- Infinite scroll / pagination loading

### 6.3 Error States
- API hatası: retry butonu + Türkçe hata mesajı
- 404: "Bu sayfa bulunamadı" 
- Network error: offline banner
- Form validation: inline field-level errors

### 6.4 Empty States
- Çalışan yok: "İlk çalışanınızı ekleyin" + CTA
- Anket yok: "İlk pulse survey'inizi başlatın" + CTA
- Her modül için meaningful empty state

### 6.5 Accessibility (WCAG 2.1 AA)
- Keyboard navigation
- Screen reader support
- Color contrast ≥4.5:1
- Focus rings
- ARIA labels

---

## ZAMAN ÇİZELGESİ

| Faz | Süre | Odak |
|---|---|---|
| **Faz 0** | 3 gün | Altyapı fix: Docker full stack, auth flow, API bağlantı |
| **Faz 1** | 5 gün | Panel / Action Center — ürünün kalbi |
| **Faz 2** | 5 gün | Çalışanlar — CRUD + search + org chart |
| **Faz 3** | 7 gün | Tükenmişlik — heatmap + pulse + müdahale (diferansiyasyon) |
| **Faz 4** | 5 gün | Anketler + Değerlendirmeler |
| **Faz 5** | 4 gün | İzinler + Belgeler + Ayarlar |
| **Faz 6** | 5 gün | Polish: responsive, loading, error, empty, a11y |
| **TOPLAM** | **34 gün** | ~5 hafta odaklı çalışma |

---

## YAKLAŞIM DEĞİŞİKLİĞİ

### Eski (başarısız):
- 20 agent paralel → hacim üretir, kalite üretmez
- Mock data her yerde → facade ürün
- "Dosya sayısı" metrik → yanlış başarı ölçüsü

### Yeni:
- **1 özellik, 1 agent, TAM ÇALIŞIR**
- Her özellik: frontend ↔ API ↔ backend ↔ DB uçtan uca
- Gerçek veri, gerçek loading, gerçek error handling
- Her tamamlanan özellik → test edilir → onaylanır → sonrakine geçilir
- **Metrik: "kullanıcı bu özelliği kullanabilir mi?" — yes/no**

---

## BAŞLANGIÇ NOKTASI

**Faz 0.4: Docker Compose tam stack** ile başla.
Tüm servisler ayağa kalksın, `curl /health` hepsi 200 dönsün.
Sonra **Faz 0.2: Auth flow** end-to-end.
Sonra **Faz 1: Action Center**.

Onay verirsen Faz 0'dan başlıyorum.

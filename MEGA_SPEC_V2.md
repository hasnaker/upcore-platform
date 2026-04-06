# UPCORE V1 · MEGA SPEC V2
## Belediye · STK · 4000+ Çalışan Enterprise

**Önceki hata:** Mimari spec yazdık ama integration contract yazmadık.
**Bu sefer:** Her flow uçtan uca, her field tek yerde, her API kontratı net.

---

## 1. HEDEF MÜŞTERİ PROFİLLERİ

### Profil A: Belediye (2.000-50.000 çalışan)
- **Birim yapısı:** Daire Başkanlığı → Müdürlük → Şeflik → Birim (4 seviye)
- **Personel tipi:** Memur (657), Sözleşmeli (4/B), İşçi (4857), Geçici
- **Özel ihtiyaç:** SGK bildirimi, kadro yönetimi, hizmet puanı, sicil
- **Karar verici:** İK Daire Başkanı, Genel Sekreter Yardımcısı
- **Ağrı noktası:** 12.000 kişi var, tükenmişlik görünmez, zabıta/temizlik yüksek risk
- **Fiyat:** Özel teklif, 50.000-200.000 ₺/ay

### Profil B: STK / Dernek / Vakıf (50-500 çalışan + gönüllüler)
- **Yapı:** Genel Merkez + Şube (il bazlı)
- **Personel tipi:** Kadrolu + Proje bazlı + Gönüllü
- **Özel ihtiyaç:** Proje bazlı çalışan atama, hibe raporlama, gönüllü takibi
- **Karar verici:** Genel Sekreter, İK Koordinatörü
- **Ağrı noktası:** Excel'de takip, turnover yüksek, tükenmişlik ölçülmüyor
- **Fiyat:** 3.000-10.000 ₺/ay

### Profil C: Holding / 4000+ Çalışan (Özel Sektör)
- **Yapı:** Holding → Şirket → Departman → Birim (multi-entity)
- **Personel tipi:** Beyaz yaka + Mavi yaka + Yönetici
- **Özel ihtiyaç:** Multi-entity consolidation, executive dashboard, SAP/Logo entegrasyon
- **Karar verici:** CHRO, İK Direktörü
- **Ağrı noktası:** Kolay İK yetmiyor, SAP pahalı, psikometrik yok
- **Fiyat:** 20.000-100.000 ₺/ay

---

## 2. STANDARDIZE EDİLMİŞ VERİ KONTRATLARI

### 2.1 Alan Adı Standardı
**KURAL:** API'da snake_case Türkçe, Frontend'de camelCase Türkçe. Mapping TEK YERDE.

```typescript
// packages/types/src/contracts/employee.ts — TEK KAYNAK
export const EMPLOYEE_FIELD_MAP = {
  // API (snake_case)     →  Frontend (camelCase)    →  DB (snake_case)
  'id':                      'id',                      'id',
  'tenant_id':               'tenantId',                'tenant_id',
  'employee_no':             'sicilNo',                 'employee_no',
  'ad':                      'ad',                      'ad',
  'soyad':                   'soyad',                   'soyad',
  'email_is':                'emailIs',                 'email_is',
  'tckn':                    'tckn',                    'tckn',
  'dogum_tarihi':            'dogumTarihi',             'dogum_tarihi',
  'hire_date':               'iseBaslamaTarihi',        'hire_date',
  'employment_status':       'durum',                   'employment_status',
  'department_id':           'departmanId',             'department_id',
  'position_id':             'pozisyonId',              'position_id',
  'manager_id':              'yoneticiId',              'manager_id',
} as const;
```

### 2.2 Durum Enum Standardı
```typescript
// Tüm sistemde AYNI değerler
export const EMPLOYMENT_STATUS = {
  ACTIVE: 'active',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
  RETIRED: 'retired',
} as const;

export const LEAVE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  MANAGER_APPROVED: 'manager_approved',
  HR_APPROVED: 'hr_approved',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const BURNOUT_LEVEL = {
  GREEN: 'green',     // ≤2.58
  AMBER: 'amber',     // 2.59-3.01
  RED: 'red',          // ≥3.02
} as const;

export const PIPELINE_STAGE = {
  APPLIED: 'applied',
  SCREENED: 'screened',
  ASSESSED: 'assessed',
  INTERVIEWED: 'interviewed',
  OFFERED: 'offered',
  HIRED: 'hired',
  REJECTED: 'rejected',
} as const;
```

---

## 3. API KONTRATLARI (OpenAPI)

### 3.1 Employee API

```yaml
# Her endpoint: request body, response body, status codes, headers
POST /api/v1/employees:
  request:
    headers:
      X-Tenant-Id: uuid (required)
      X-User-Id: uuid (required)
    body:
      ad: string (required, 1-100)
      soyad: string (required, 1-100)
      email_is: string (email format)
      tckn: string (11 digit, mod10/11 valid) (optional)
      dogum_tarihi: date (YYYY-MM-DD) (optional)
      hire_date: date (required)
      department_id: uuid (optional)
      position_id: uuid (optional)
      manager_id: uuid (optional)
      employment_status: enum (default: 'active')
  response:
    201:
      body: { id, tenant_id, employee_no, ad, soyad, email_is, tckn, hire_date, employment_status, created_at }
    400: { error: "validation_error", details: [{field, message}] }
    409: { error: "duplicate", message: "Bu email zaten kayıtlı" }

GET /api/v1/employees:
  request:
    query:
      page: int (default 1)
      limit: int (default 20, max 100)
      search: string (ad/soyad/email/sicil fuzzy search)
      department_id: uuid (filter)
      employment_status: enum (filter)
      sort: string (default 'ad')
      order: 'asc' | 'desc'
  response:
    200:
      body:
        items: Employee[]
        total: int
        page: int
        limit: int

GET /api/v1/employees/:id:
  response:
    200: Employee (full object with department, position, manager names)
    404: { error: "not_found" }

PATCH /api/v1/employees/:id:
  request:
    body: Partial<Employee> (only changed fields)
  response:
    200: Employee (updated)

DELETE /api/v1/employees/:id:
  response:
    200: { message: "Çalışan devre dışı bırakıldı" } (soft delete)
```

### 3.2 Survey API (Burnout Pulse)

```yaml
POST /api/v1/surveys:
  description: HR creates a new pulse survey
  request:
    body:
      instrument_id: uuid (BAT-12-TR instrument)
      title: string
      scheduled_at: datetime (optional, immediate if null)
      target_department_ids: uuid[] (empty = all)
  response:
    201: Survey { id, title, instrument_id, status: 'draft', invitation_count }

POST /api/v1/surveys/:id/distribute:
  description: Send survey to employees
  response:
    200: { distributed: N, skipped: M }

POST /api/v1/surveys/:id/respond:
  description: Employee submits survey response (anonymous)
  request:
    headers:
      X-Survey-Token: string (anonymous token, NOT user JWT)
    body:
      responses: [ { item_id: uuid, value: int (1-5) } ]
  response:
    201: { message: "Yanıtınız kaydedildi. Teşekkürler." }
    400: { error: "Tüm soruları cevaplayın" }
    409: { error: "Bu anketi zaten cevapladınız" }

GET /api/v1/surveys/:id/results:
  description: HR views aggregated results (min N=5)
  response:
    200:
      overall:
        exhaustion: float
        mental_distance: float
        cognitive_impairment: float
        emotional_impairment: float
        total: float
        level: 'green' | 'amber' | 'red'
        respondent_count: int
      by_department:
        - department_id, department_name, scores, respondent_count
      note: "N<5 olan departmanlar gizlenir"
    403: { error: "N<5, sonuçlar gösterilemez" }
```

### 3.3 Action Center API

```yaml
GET /api/v1/actions/top:
  description: Top priority actions for current user
  request:
    query:
      limit: int (default 5, max 5 — Miller's law)
  response:
    200:
      items:
        - id: uuid
          type: 'burnout_alert' | 'assessment_ready' | 'leave_pending' | 'intervention_needed'
          urgency: 'critical' | 'warning' | 'info'
          title: string (Turkish, 1 line)
          description: string (Turkish, 2-3 lines)
          affected_employee_id: uuid (optional)
          affected_department_id: uuid (optional)
          meta: { count, trend, days_since }
          suggested_action: 'coaching' | 'intervention' | 'review' | 'approve'
          reasoning: string[] (3 sentences explaining WHY)
          created_at: datetime

POST /api/v1/actions/:id/decide:
  request:
    body:
      decision: 'approve' | 'reject' | 'defer'
      note: string (optional)
  response:
    200: { message: "Aksiyon onaylandı", next_step: "Koçluk görüşmesi planlandı" }
```

---

## 4. END-TO-END USER FLOWS

### Flow 1: Çalışan Ekleme (Employee Create)

```
KULLANICI                    FRONTEND                      BACKEND                    DATABASE
─────────                    ────────                      ───────                    ────────
1. "/calisanlar" sayfasında
   "Yeni Çalışan" butonuna
   tıklar
                             2. /calisanlar/yeni sayfası
                                açılır. Form gösterilir:
                                Ad*, Soyad*, Email, TCKN,
                                Departman (dropdown API'dan),
                                Başlama Tarihi*

3. Formu doldurur,
   "Kaydet" tıklar
                             4. Zod validation çalışır
                                (client-side):
                                - ad min 1, max 100
                                - soyad min 1, max 100
                                - email format check
                                - TCKN mod10/11 check
                                - hire_date required
                                Hata varsa → inline error

                             5. Validation geçerse →
                                POST /api/v1/employees
                                Body: { ad, soyad, email_is,
                                tckn, hire_date, department_id }
                                                              6. employee-service:
                                                                 - Validate fields
                                                                 - Check email unique
                                                                 - Generate employee_no
                                                                 - SET app.tenant_id
                                                                                           7. INSERT INTO
                                                                                              app.employees
                                                                                              RETURNING *

                                                              8. Publish event:
                                                                 employee.created.v1

                                                              9. Return 201 + employee

                             10. Başarılı:
                                 - Toast: "Çalışan eklendi ✓"
                                 - Router.push(/calisanlar/[id])
                                 Hata:
                                 - Toast: "Email zaten kayıtlı"
                                 - Form field highlight
```

### Flow 2: Pulse Survey (Tükenmişlik Ölçümü)

```
HR                           FRONTEND                      BACKEND                    DATABASE
──                           ────────                      ───────                    ────────
1. "/anketler" sayfasında
   "Yeni Anket" tıklar
                             2. Modal açılır:
                                Instrument: BAT-12-TR
                                Hedef: Tüm çalışanlar
                                                              
3. "Gönder" tıklar
                             4. POST /api/v1/surveys
                                { instrument_id, title }
                                                              5. survey-service:
                                                                 - Create survey
                                                                 - Generate anonymous tokens
                                                                 - For each employee:
                                                                   create invitation
                                                                                           6. INSERT survey
                                                                                              INSERT invitations
                                                              7. POST /api/v1/surveys/:id/distribute
                                                                 → notification-service:
                                                                   email each employee
                                                                   with anonymous link

───── ÇALIŞAN TARAFI ─────

ÇALIŞAN                      FRONTEND                      BACKEND
───────                      ────────                      ───────
8. Email'deki linke tıklar
   (/anket/cevapla?token=xxx)
                             9. Token ile GET /api/v1/surveys/respond/:token
                                → 12 BAT-12-TR sorusu gelir

10. Her soruyu 1-5 arası
    puanlar (Likert)
                             11. POST /api/v1/surveys/:id/respond
                                 { responses: [{item_id, value: 4}, ...] }
                                 Header: X-Survey-Token (NOT JWT)
                                                              12. survey-service:
                                                                  - Validate 12 responses
                                                                  - Store anonymously
                                                                  - POST psychometric-scoring:8021
                                                                    /api/v1/score/bat12
                                                                    { responses: [4,3,5,...] }
                                                                                              
                                                              13. psychometric-scoring:
                                                                  - Calculate 4 subscales
                                                                  - Calculate total
                                                                  - Classify: green/amber/red
                                                                  - Return BATResult

                                                              14. Store burnout_signal
                                                                  If RED → publish
                                                                  burnout.critical.v1

                             15. "Teşekkürler! Yanıtınız
                                  kaydedildi." sayfası

───── HR SONUÇ GÖRME ─────

HR                           FRONTEND                      BACKEND
──                           ────────                      ───────
16. "/tukenmislik" sayfası
                             17. GET /api/v1/burnout/heatmap
                                                              18. Aggregate burnout_signals
                                                                  by department, by week
                                                                  Apply N≥5 rule
                                                              
                             19. Heatmap render:
                                 6 dept × 4 hafta grid
                                 Renk kodlu hücreler
                                 Tıklanabilir departman
                                 Kritik çalışan listesi
```

### Flow 3: Action Center (Karar Verme)

```
HR                           FRONTEND                      BACKEND
──                           ────────                      ───────
1. "/panel" sayfası açılır
                             2. GET /api/v1/actions/top?limit=5
                                                              3. action-center-service:
                                                                 - Scan burnout_signals (RED)
                                                                 - Scan pending leaves
                                                                 - Scan assessment results
                                                                 - Score: urgency×impact×actionability
                                                                 - Sort, take top 5
                                                                 - For each: generate Turkish reasoning
                                                                   via Azure OpenAI (cache 30min)

                             4. 3-5 aksiyon kartı render:
                                Her kart: urgency badge +
                                title + description + CTA

5. "Koçluk Öner →" tıklar
                             6. Decision flow sayfası:
                                Sol: Çalışan profil özet
                                Sağ: "Neden öneriyoruz" 3 gerekçe
                                Alt: Onayla / Reddet / Sonra

7. "Onayla" tıklar
                             8. POST /api/v1/actions/:id/decide
                                { decision: 'approve' }
                                                              9. action-center:
                                                                 - Mark action resolved
                                                                 - Create intervention assignment
                                                                 - Send notification to employee
                                                                 - Log audit event

                             10. Toast: "Koçluk görüşmesi
                                  planlandı ✓"
                                 Kart fade out, sonraki
                                 kart slide in
```

### Flow 4: İzin Talebi (Leave Request)

```
ÇALIŞAN                      FRONTEND                      BACKEND
───────                      ────────                      ───────
1. "/izinler" → "Yeni İzin"
                             2. Modal: Tip (yıllık/mazeret/
                                hastalık), Başlangıç, Bitiş,
                                Neden (optional), Belge upload

3. Doldurur, "Gönder"
                             4. POST /api/v1/leaves/requests
                                { type, start_date, end_date, reason }
                                                              5. leave-service:
                                                                 - Check balance sufficient
                                                                 - Check no overlap
                                                                 - Calculate business days
                                                                   (exclude resmi tatiller)
                                                                 - Status: 'pending'
                                                                 - Notify manager

YÖNETICI                     FRONTEND                      BACKEND
────────                     ────────                      ───────
6. "/izinler" Ekip tab →
   pending request görür
                             7. "Onayla" / "Reddet" buton
8. "Onayla" tıklar
                             9. POST /api/v1/leaves/requests/:id/approve
                                                              10. leave-service:
                                                                  - Update status → approved
                                                                  - Deduct from balance
                                                                  - Notify employee
                                                                  - Publish leave.approved.v1

                             11. Toast: "İzin onaylandı ✓"
                                 Status → green pill
```

---

## 5. FRONTEND ↔ BACKEND MAPPING KATMANI

```typescript
// packages/api-client/src/mappers/employee.ts
// TEK YER — API response → Frontend object

export interface EmployeeView {
  id: string;
  sicilNo: string;
  ad: string;
  soyad: string;
  tamAd: string;        // computed: `${ad} ${soyad}`
  email: string;
  tckn: string | null;
  dogumTarihi: string | null;
  iseBaslamaTarihi: string;
  kidem: number;         // ay cinsinden
  durum: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'retired';
  durumLabel: string;    // Türkçe: "Aktif", "İzinde", "Ayrılmış"
  departmanId: string | null;
  departmanAd: string | null;  // joined
  pozisyonId: string | null;
  pozisyonAd: string | null;   // joined
  yoneticiId: string | null;
  yoneticiAd: string | null;   // joined
  avatarUrl: string | null;
  initials: string;       // computed: first letters of ad+soyad
}

export function mapApiToView(api: ApiEmployee): EmployeeView {
  return {
    id: api.id,
    sicilNo: api.employee_no || '',
    ad: api.ad || '',
    soyad: api.soyad || '',
    tamAd: `${api.ad || ''} ${api.soyad || ''}`.trim(),
    email: api.email_is || '',
    tckn: api.tckn || null,
    dogumTarihi: api.dogum_tarihi || null,
    iseBaslamaTarihi: api.hire_date || '',
    kidem: api.tenure_months || 0,
    durum: api.employment_status || 'active',
    durumLabel: STATUS_LABELS[api.employment_status] || 'Bilinmiyor',
    departmanId: api.department_id || null,
    departmanAd: api.department_name || null,
    pozisyonId: api.position_id || null,
    pozisyonAd: api.position_name || null,
    yoneticiId: api.manager_id || null,
    yoneticiAd: api.manager_name || null,
    avatarUrl: null,
    initials: getInitials(api.ad, api.soyad),
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  on_leave: 'İzinde',
  suspended: 'Askıda',
  terminated: 'Ayrılmış',
  retired: 'Emekli',
};

function getInitials(ad?: string, soyad?: string): string {
  const a = (ad || '?').charAt(0).toUpperCase();
  const s = (soyad || '?').charAt(0).toUpperCase();
  return `${a}${s}`;
}
```

---

## 6. ÖLÇEKLENEBİLİRLİK (4000+ Çalışan)

### Belediye Senaryosu: 12.000 Çalışan

| İşlem | Gerekli Performans | Nasıl |
|---|---|---|
| Çalışan listesi | <500ms 20 kayıt | Pagination + index on tenant_id |
| Full-text search | <300ms | pg_trgm + GIN index |
| Burnout heatmap | <1s 34 birim | Materialized view, 15dk refresh |
| Pulse survey dağıtım | <5min 12K email | Batch queue (Service Bus) |
| CSV import 4000 satır | <30s | Batched INSERT (100'lük gruplar) |
| Org chart render | <1s 34 birim | ltree, pre-computed tree |
| Executive report PDF | <10s | Background job + notification |

### DB Optimization

```sql
-- Burnout heatmap materialized view (15dk refresh)
CREATE MATERIALIZED VIEW mv_burnout_heatmap AS
SELECT
  d.id as department_id,
  d.ad as department_name,
  date_trunc('week', bs.created_at) as week,
  AVG(bs.total_score) as avg_score,
  COUNT(DISTINCT bs.employee_id) as respondent_count
FROM app.burnout_signals bs
JOIN app.employees e ON e.id = bs.employee_id
JOIN app.departments d ON d.id = e.department_id
WHERE bs.created_at > now() - interval '5 weeks'
GROUP BY d.id, d.ad, date_trunc('week', bs.created_at);

-- 15 dakikada bir refresh
-- (Cron job veya pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_burnout_heatmap;
```

---

## 7. BELEDİYE-SPESIFIK MODÜL GENİŞLEMELERİ (V2)

- **Kadro Yönetimi:** Dolu/boş kadro takibi, kadro talebi, onay süreci
- **Memur/İşçi Ayrımı:** 657 vs 4857, farklı izin hakları, farklı tazminat
- **Hizmet Puanı:** Otomatik hesaplama (yıl × konum × bonus)
- **Sicil Yönetimi:** Disiplin kaydı, terfi/tenzil, tayin
- **Birim Bazlı Dashboard:** Her müdürlük kendi KPI'larını görsün
- **Belediye Başkanı Dashboard:** Tüm kurum özet (çalışan, tükenmişlik, izin)

---

## 8. IMPLEMENTATION ÖNCELİK SIRASI

### Sprint 1 (1 hafta): Çalışan CRUD E2E
```
[x] API kontratı tanımla (yukarıdaki spec)
[x] Mapper katmanı yaz (mapApiToView)
[ ] GET /employees → gerçek veri → liste sayfası
[ ] POST /employees → form → DB'ye kayıt → toast → redirect
[ ] GET /employees/:id → detay sayfası (tabs: genel/izin/belge)
[ ] PATCH /employees/:id → düzenleme formu → kaydet
[ ] DELETE /employees/:id → soft delete → listeden çıkar
[ ] Search (pg_trgm) çalışsın
[ ] Department dropdown (API'dan) çalışsın
```

### Sprint 2 (1 hafta): Pulse Survey E2E
```
[ ] HR: Yeni anket oluştur → distribute → email gönder
[ ] Çalışan: Anonymous link → 12 soru → submit → skorlama
[ ] HR: Sonuçları gör (heatmap, departman bazlı, N≥5)
[ ] Burnout signal → Action Center'da card oluşsun
```

### Sprint 3 (1 hafta): Action Center E2E
```
[ ] ML service: priority scoring çalışsın
[ ] Top 5 actions API → panel sayfası
[ ] Decision flow: tıkla → gerekçe gör → onayla/reddet
[ ] Onay → intervention assignment otomatik
[ ] Notification → çalışana email
```

### Sprint 4 (1 hafta): İzin + Belge E2E
```
[ ] İzin talebi → onay akışı → bakiye güncelleme
[ ] 4857 İş Kanunu hesaplama doğru çalışsın
[ ] Belge upload → Azure Blob → download (signed URL)
[ ] KVKK consent flow
```

### Sprint 5 (1 hafta): Polish + Belediye Demo
```
[ ] Responsive design
[ ] Error/loading/empty states
[ ] 12.000 çalışan performans testi
[ ] Belediye demo verisi (Samsun BB)
[ ] Executive dashboard
```

---

## 9. BU SPEC'İN GARANTİSİ

Bu spec'teki her flow implement edildiğinde:
- Belediye İK müdürü 12K çalışanın tükenmişliğini 30 saniyede görebilir
- STK genel sekreteri pulse survey gönderip 1 gün sonra sonuç alabilir
- Holding CHRO Action Center'dan günlük 3 kararı 5 dakikada verebilir
- Her buton bir şey YAPAR, her form bir şey KAYDEDer, her veri GERÇEK

Önceki spec gibi facade değil — her satır bir API call, her API call bir DB mutation, her mutation bir UI update.

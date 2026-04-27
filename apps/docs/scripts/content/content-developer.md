===PAGE id=kavramlar-mimari-genel-bakis title=Mimari genel bakış pos=1===
# Mimari genel bakış

UpCore platformu microservice mimarisi üzerine kurulu.

## Yüksek seviye diagram

```
[Frontend: Next.js 15] → [API Gateway (Go)] → [17 mikroservis]
                                             ↓
                                   [PostgreSQL 16 + pgvector]
                                             ↓
                                   [ML servisleri (Python FastAPI)]
```

## Servisler

| Servis | Dil | Sorumluluk |
|---|---|---|
| api-gateway | Go | Tek giriş noktası, auth, rate limit, routing |
| auth | Go | Clerk webhook, JWT validation, RBAC |
| tenant | Go | Tenant yönetimi, billing, feature flag |
| employee | Go | Çalışan CRUD |
| organization | Go | Departman hiyerarşi |
| leave | Go | İzin yönetimi |
| document | Go | Dosya yönetim (sözleşme, belgeler) |
| survey | Go | Pulse anket |
| assessment | Go | Psikometrik değerlendirme |
| intervention | Go | Müdahale yönetim |
| performance | Go | OKR, 360, 9-kutu, PIP |
| mobility | Go | İç ilan, succession |
| ats | Go | İşe alım pipeline |
| notification | Go | Multi-channel bildirim |
| bordro | Go | Maaş bordrosu + SGK |
| billing | Go | Stripe/İyzico + plan |
| audit | Go | Audit log WORM |

## Dış bağımlılıklar

- **PostgreSQL 16 + pgvector** — primary store
- **Redis** — cache, pub/sub, rate limit
- **Azure Blob Storage** — file storage
- **Clerk** — auth provider
- **Stripe / İyzico** — ödeme
- **SendGrid** — e-posta
- **Iletimerkezi** — SMS (Türkiye)
- **Bunny.net / Azure CDN** — statik asset
- **ML Services (Python FastAPI):** psychometric-scoring, burnout-prediction, recommendation, action-center

## Deploy

- **Kubernetes** (Azure AKS)
- Turbo monorepo (Next.js + Go services)
- Helm chart + ArgoCD
- GitHub Actions CI
- Blue-green deployment

===PAGE id=kavramlar-kimlik-dogrulama title=Kimlik doğrulama pos=2===
# Kimlik doğrulama

UpCore API'si iki tür kimlik doğrulama destekler.

## 1. Clerk JWT (user-facing)

Çalışanın kendi adına API çağırması için:
```
Authorization: Bearer <clerk_jwt_token>
```

Clerk tarafından üretilen JWT:
- RS256 imza
- 1 saat geçerli (refresh otomatik)
- Payload: user_id, tenant_id, roles, permissions

API Gateway Clerk public key ile doğrular.

## 2. API anahtarı (machine-to-machine)

Servisler arası veya kendi uygulamanızdan:
```
Authorization: Bearer upc_sk_live_abc123...
```

API key format:
- Prefix: `upc_sk_live_` (production) veya `upc_sk_test_` (test)
- 32 karakter random

## Scope

Her request için token doğrulanır + permission kontrol:
- `employees:read` — çalışan listesi
- `pulses:write` — anket oluşturma
- `admin:*` — tam yetki (admin role)

## Hata kodları

- 401 — token eksik / invalid
- 403 — token geçerli ama scope yetersiz
- 404 — kaynak tenant için erişilebilir değil

## Refresh

Clerk JWT otomatik refresh (frontend SDK). API key manual rotation (90 günde 1 önerisi).

===PAGE id=kavramlar-coklu-tenant title=Çoklu tenant (multi-tenant) pos=3===
# Çoklu tenant (multi-tenant) modeli

UpCore **shared database, shared schema** multi-tenancy kullanır.

## Tenant izolasyonu

Her tablo:
- `tenant_id UUID NOT NULL` sütunu
- **Row-Level Security (RLS)** policy: `WHERE tenant_id = current_setting('app.current_tenant_id')`
- Index: `(tenant_id, ...)` leading her sorgu için

## Connection management

Her istek:
1. JWT/API key'den tenant_id çıkarılır
2. Connection pool'dan connection al
3. `SET LOCAL app.current_tenant_id = '...'`
4. Sorgu çalıştır — RLS otomatik filtre
5. Connection geri ver

## Cross-tenant erişim

Çok nadir — sadece:
- Admin panelden super_admin rolü
- Billing rapor
- Anonim agrega analytics

Her cross-tenant sorgu audit log'a yazılır.

## Bypass önleme

- SQL injection: Parameterized queries zorunlu
- RLS bypass: PostgreSQL `FORCE ROW LEVEL SECURITY`
- Admin account: Ayrı database credential
- Audit: Anomali tespiti

## Performans

- Tenant başına table prefix yok (tek shared tablo)
- Partitioning bazı büyük tablolar için (pulse_responses, audit_log)
- Vacuum schedule her tenant için ayrı

===PAGE id=kavramlar-hata-kodlari title=Hata kodları pos=4===
# Hata kodları

HTTP status + error code + message.

## HTTP status

| Code | Anlam |
|---|---|
| 200 | Başarı |
| 201 | Oluşturuldu |
| 202 | Kuyruğa alındı (async) |
| 204 | İçerik yok (delete) |
| 400 | Kötü istek |
| 401 | Auth eksik |
| 403 | Yetki yetersiz |
| 404 | Bulunamadı |
| 409 | Çelişki |
| 422 | İşlenemez (validation) |
| 429 | Rate limit aşıldı |
| 500 | Sunucu hatası |
| 503 | Geçici olarak kullanılamıyor |

## Hata response formatı

```json
{
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "Çalışan bulunamadı",
    "request_id": "req_abc123",
    "field_errors": {
      "email": "E-posta formatı geçersiz"
    }
  }
}
```

## Error code prefix listesi

- `AUTH_` — kimlik doğrulama
- `VALIDATION_` — input validation
- `PERMISSION_` — yetkilendirme
- `RATE_LIMIT_` — rate limit
- `RESOURCE_` — kaynak bulunamadı
- `CONFLICT_` — çelişki (duplicate, stale update)
- `EXTERNAL_` — 3. taraf servis hatası
- `INTERNAL_` — sunucu hatası

## Retry logic

| Status | Retry? | Backoff |
|---|---|---|
| 429 | Evet | Retry-After header |
| 500 | Evet | Exponential (max 3) |
| 502, 503, 504 | Evet | Exponential (max 5) |
| 4xx (diğer) | Hayır | — |

## Request ID

Her request response'unda `X-Request-Id` header — destek ticketı için paylaşın.

===PAGE id=kavramlar-idempotency title=Idempotency (tekrar güvenlik) pos=5===
# Idempotency (tekrar güvenlik)

Aynı isteği iki kez göndermenin güvenli olması.

## Neden gerekli?

- Network timeout — istek gitti mi gitmedi mi?
- Tekrar deneme logic — client retry
- Webhook delivery — duplicate olabilir

## Desteklenen endpoint'ler

POST / PUT / PATCH endpoint'leri:
- Ödeme işlemleri
- Müdahale planı oluşturma
- Çalışan import (CSV)
- Webhook delivery

## Nasıl kullanılır?

```
POST /api/v1/payments
Idempotency-Key: <unique-uuid>
```

- UUID v4 önerilir
- 24 saat saklanır
- Aynı key ile 2. istek → cached response döner

## Garanti

- Aynı key + aynı body → aynı response (200-299)
- Aynı key + farklı body → 409 Conflict
- 24 saat sonra key expire → yeni istek gibi işlenir

## Client SDK

UpCore SDK'lar otomatik idempotency key üretir:
- JavaScript: `upcore.payments.create({...})` — auto key
- Python: aynı
- Go: aynı

===PAGE id=kavramlar-pagination title=Pagination (sayfalama) pos=6===
# Pagination (sayfalama)

Büyük veri setlerini sayfa sayfa çekme.

## Cursor-based (önerilen)

```
GET /api/v1/employees?limit=50&cursor=eyJpZCI6ImVtcF8xMjMifQ==
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6ImVtcF8xNzMifQ==",
    "has_more": true
  }
}
```

- Cursor opaque (base64 encoded)
- Stable sort (data değişse bile skip yok)
- Performanslı (indexed lookup)

## Offset-based (legacy)

```
GET /api/v1/employees?limit=50&offset=100
```

- Kolay ama büyük offset yavaş
- Data değişiminde drift riski (eklemeler/silmeler)
- 1000+ kayıt için önerilmez

## Limit

- Default: 20
- Max: 100 (çoğu endpoint)
- Büyük batch için async export kullan

## Toplam sayı

`total_count` opsiyonel — hesabı pahalı:
```
GET /api/v1/employees?include=total_count
```

Varsayılan dönmez. İstenirse ayrı hesap yapılır.

===PAGE id=api-genel-bakis title=API genel bakış pos=1===
# API genel bakış

UpCore REST API'si 17 servise bölünmüştür. Her servisin kendi OpenAPI 3.1 spec'i vardır.

## Base URL'ler

- Production: `https://api.upcore.io`
- Staging: `https://api.staging.upcore.io`
- Sandbox: `https://api.sandbox.upcore.io`
- Local: `http://localhost:8080` (api-gateway)

## Servis-spesifik endpoint'ler

Gateway arkasındaki her servis kendi path prefix:
- `/api/v1/auth/*` → auth service
- `/api/v1/employees/*` → employee service
- `/api/v1/pulses/*` → survey service
- `/api/v1/interventions/*` → intervention service
- ...

Tam liste: [Servis API'leri sidebar'ı](./auth)

## Versioning

- URL path: `/api/v1/`, `/api/v2/`
- Semantic versioning
- Breaking change = major version bump
- Backward compat: eski versiyon 12 ay destek

## Content type

- Request + response: `application/json; charset=utf-8`
- File upload: `multipart/form-data`
- Stream: `text/event-stream` (ör. uzun süren işler)

## Locale

- `Accept-Language` header: `tr-TR,en;q=0.9`
- Response field `message` localize edilmiş
- Date format: ISO 8601 UTC

## "Try it out" sandbox

Her endpoint sayfasında **"Try it out"** butonu:
- Sandbox environment
- Rate limit: sınırsız
- Test data prefab
- Auth: sandbox API key otomatik

===PAGE id=api-rate-limit title=Rate limit pos=2===
# Rate limit

## Limitler

| Plan | API/dakika | API/gün | Concurrent |
|---|---|---|---|
| Starter | 100 | 10 000 | 10 |
| Growth | 500 | 100 000 | 30 |
| Enterprise | 1000 | 1 000 000 | 100 |
| Enterprise Plus | Sınırsız | 10 000 000 | 500 |

## Response header

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 453
X-RateLimit-Reset: 1713873600
Retry-After: 42
```

## 429 Too Many Requests

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Çok fazla istek",
    "retry_after_seconds": 42
  }
}
```

## Algoritma

- Sliding window (Redis)
- IP + tenant_id + endpoint kombinasyonu
- Burst allow (%20 kısa vadeli aşım)

## Optimizasyon

- Cache kullan (response cache header destekleniyor)
- Bulk endpoint kullan (tek tek yerine)
- Webhook consume et (polling yerine)
- Rate limit header'ı izle (retry logic client tarafında)

===PAGE id=api-versiyonlama title=API versiyonlama pos=3===
# API versiyonlama

Breaking change yönetimi.

## Semantic versioning

- **Major (v1 → v2):** Breaking change
- **Minor (v1.1 → v1.2):** Yeni özellik, backward compatible
- **Patch (v1.1.1 → v1.1.2):** Bug fix

URL'de sadece major version.

## Destek süresi

- **Current version:** Full destek
- **Previous major:** 12 ay destek sonrası deprecated
- **Deprecated:** 6 ay warning, sonra 410 Gone

Örnek timeline:
- 2026-01: v2 çıktı → v1 deprecated
- 2026-07: v1 warning header
- 2027-01: v1 kapatıldı

## Breaking change örnekleri

- Field rename (eski → yeni)
- Required field ekleme
- Response structure değişimi
- Endpoint path değişimi
- Auth scheme değişimi

## Migration rehberi

Her major version çıkışında:
- Migration guide yayımlanır
- Code sample diff
- Automated migration script (mümkünse)
- Support team 1-1 destek (Enterprise)

## Deprecation header

Deprecated endpoint:
```
Deprecation: true
Sunset: Wed, 01 Jan 2027 00:00:00 GMT
Link: <https://docs.upcore.io/migration/v1-to-v2>; rel="alternate"
```

===PAGE id=api-try-it-out-sandbox title=Try it out sandbox pos=4===
# Try it out sandbox

Her API endpoint sayfasında "Try it out" butonu.

## Sandbox environment

- Base URL: `https://api.sandbox.upcore.io`
- Auth: auto-provided sandbox API key
- Data: test tenant + 50 mock çalışan
- Rate limit: sınırsız
- Reset: her gece UTC 00:00'da data reset

## Kullanım

1. API dokümantasyon sayfasında endpoint'e git
2. **Try it out** butonu
3. Parametreler otomatik örnek değerle doldurulur
4. **Execute** → response görünür
5. Curl command copy

## Sandbox data

Test tenant içinde:
- 50 çalışan (fake name, random TCKN)
- 5 departman
- 3 ay geriye pulse verisi
- 2 aktif müdahale planı
- 10 OKR

Hepsi mock — gerçek kişi / şirket verileri yok.

## Playground özellikleri

- Request history (son 20)
- Response inspect (headers, body, timing)
- Code generation (curl, Python, JavaScript, Go)
- Save request (favorites)
- Share link (deep-link to specific request)

## Geçiş: sandbox → production

- API key değişimi: `upc_sk_test_...` → `upc_sk_live_...`
- Base URL: `sandbox.upcore.io` → `api.upcore.io`
- Response format identical
- Production rate limit aktif

===PAGE id=webhook-genel-bakis title=Webhook genel bakış pos=1===
# Webhook genel bakış

Olaylara (event) dayalı push bildirimler.

## Push vs Pull

UpCore webhook push modeli:
- Olay oluşunca sunucu → client'a HTTP POST
- Polling yerine
- Düşük latency (saniyeler)
- Server kaynak tasarrufu

## Kurulum

**Admin > Operasyon > Webhooks > + Yeni**

- Endpoint URL (HTTPS)
- Olay filtreleri (subset)
- Signing secret
- Test delivery

## Konfigürasyon örneği

```json
{
  "url": "https://your-app.com/upcore-webhook",
  "events": ["pulse.completed", "intervention.started"],
  "secret": "whsec_abc...",
  "active": true,
  "retry_policy": {
    "max_attempts": 10,
    "backoff": "exponential"
  }
}
```

## Delivery görünürlük

**Admin > Webhooks > Teslimat geçmişi**

Her delivery için:
- Timestamp
- Response status
- Response time
- Payload
- Next retry (varsa)

===PAGE id=webhook-imzalama title=Webhook imzalama ve doğrulama pos=2===
# Webhook imzalama ve doğrulama

## İmzalama algoritması

HMAC-SHA256:
```
signature = HMAC_SHA256(secret, timestamp + "." + body)
```

## Header

```
X-UpCore-Signature: t=1713873600,v1=abc123def456...
X-UpCore-Delivery-Id: wh_xyz789
X-UpCore-Timestamp: 1713873600
```

## Doğrulama (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhook(req, secret) {
  const signatureHeader = req.headers['x-upcore-signature'];
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).slice(2);
  const signature = parts.find(p => p.startsWith('v1=')).slice(3);

  // 5 dk replay koruması
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error('Timestamp too old');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(req.body)}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )) {
    throw new Error('Invalid signature');
  }
  return true;
}
```

## Python doğrulama

```python
import hmac
import hashlib

def verify_webhook(body, timestamp, signature, secret):
    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{body}".encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

## Replay attack koruması

- Timestamp header 5 dakikadan eski ise red
- Delivery ID ile idempotency

===PAGE id=webhook-retry-politikasi title=Retry politikası pos=3===
# Retry politikası

## Algoritma

Başarısız webhook için **exponential backoff**:

| Deneme | Bekleme |
|---|---|
| 1 | 0 s (ilk deneme) |
| 2 | 1 s |
| 3 | 4 s |
| 4 | 16 s |
| 5 | 64 s (~1 dk) |
| 6 | 256 s (~4 dk) |
| 7 | 1024 s (~17 dk) |
| 8 | 4096 s (~68 dk) |
| 9 | 16 384 s (~4.5 saat) |
| 10 | 65 536 s (~18 saat) |

Toplam denemeler 48 saat içinde biter.

## Başarı koşulu

- HTTP 200-299 → başarı
- HTTP 3xx → redirect follow (1 kez)
- HTTP 4xx → **retry yok** (client sorunu)
- HTTP 5xx → retry
- Timeout (30 sn) → retry
- Connection error → retry

## Circuit breaker

- 5 dakika içinde > %50 fail → endpoint 5 dakika devre dışı
- Sonraki "half-open" test
- Başarılıysa → normal
- Başarısızsa → 10 dakika devre dışı

## Manuel retry

Admin panel > Webhook > Delivery > "Retry now"

## Çöken consumer

Tüm retry'lar bittikten sonra:
- Delivery status → "permanent_failure"
- Alert → admin e-posta
- 30 gün sonra history'den silinir

===PAGE id=webhook-olaylar title=Webhook olayları pos=4===
# Webhook olayları

Platform üzerindeki önemli olayların listesi.

## Employee olayları

- `employee.created` — yeni çalışan eklendi
- `employee.updated` — profil güncellendi
- `employee.terminated` — ayrılış
- `employee.reactivated` — geri dönüş

## Pulse olayları

- `pulse.created` — yeni pulse anketi oluşturuldu
- `pulse.sent` — çalışanlara gönderildi
- `pulse.completed` — yeterli cevap toplandı (yüzde eşik)
- `pulse.response_anomaly` — anlamlı trend değişimi

## Intervention olayları

- `intervention.recommended` — Thompson sampling öneri yapıldı
- `intervention.consent_sent` — çalışana rıza gitti
- `intervention.started` — plan başladı
- `intervention.check_in` — check-in tamamlandı
- `intervention.completed` — süre doldu, etki ölçümü tamamlandı

## Performance olayları

- `okr.created`
- `okr.progress_updated`
- `review.submitted` (360)
- `calibration.completed` (9-kutu)
- `pip.started`

## Bordro olayları

- `payroll.run_started`
- `payroll.run_completed`
- `payroll.payslip_generated`

## Audit olayları

- `audit.anomaly_detected` — olağandışı aktivite
- `audit.impersonation_started`
- `audit.bulk_export_completed`

## KVKK olayları

- `gdpr.request_received` — Madde 11 talebi
- `gdpr.request_completed`
- `gdpr.breach_detected`

## Mobility olayları

- `internal_posting.created`
- `application.submitted`
- `succession.updated`

## Payload örneği

```json
{
  "event": "intervention.completed",
  "event_id": "evt_abc123",
  "tenant_id": "tnt_xyz789",
  "timestamp": "2026-04-23T14:30:00Z",
  "data": {
    "intervention_id": "int_456",
    "plan_id": "plan_789",
    "duration_weeks": 8,
    "cohens_d": 0.42,
    "significance": "medium"
  }
}
```

===PAGE id=sdk-javascript title=JavaScript / TypeScript SDK pos=1===
# JavaScript / TypeScript SDK

Node.js + browser.

## Kurulum

```bash
npm install @upcore/sdk
```

## Quick start

```typescript
import { UpCoreClient } from '@upcore/sdk';

const client = new UpCoreClient({
  apiKey: process.env.UPCORE_API_KEY,
  environment: 'production', // veya 'sandbox'
});

const employees = await client.employees.list({
  departmentId: 'dept_123',
  limit: 50,
});

for await (const emp of client.employees.listPaginated()) {
  console.log(emp.email);
}
```

## TypeScript tipler

```typescript
import type { Employee, PulseResponse } from '@upcore/sdk';

const emp: Employee = await client.employees.get('emp_123');
```

## Webhook doğrulama

```typescript
import { verifyWebhook } from '@upcore/sdk/webhooks';

app.post('/webhook', (req, res) => {
  try {
    verifyWebhook(req, process.env.UPCORE_WEBHOOK_SECRET);
    // process event
    res.status(200).send('ok');
  } catch (err) {
    res.status(401).send('invalid signature');
  }
});
```

## Özellikler

- Auto retry (exponential backoff)
- Auto idempotency key
- Pagination helper
- Webhook signature verification
- TypeScript strict mode
- Tree-shakeable (modular)
- 0 runtime dependencies (fetch native)

## Versiyon

- `@upcore/sdk@2.x` — ES2022, Node 18+
- `@upcore/sdk@1.x` — legacy, Node 14+ (deprecated)

===PAGE id=sdk-python title=Python SDK pos=2===
# Python SDK

Python 3.9+.

## Kurulum

```bash
pip install upcore-sdk
```

## Quick start

```python
from upcore import UpCoreClient

client = UpCoreClient(
    api_key=os.environ["UPCORE_API_KEY"],
    environment="production",
)

employees = client.employees.list(department_id="dept_123", limit=50)

for emp in client.employees.list_paginated():
    print(emp.email)
```

## Async destek

```python
from upcore import AsyncUpCoreClient

async def main():
    async with AsyncUpCoreClient(api_key=API_KEY) as client:
        employees = await client.employees.list()
```

## Pydantic modeller

```python
from upcore.models import Employee, PulseResponse

emp: Employee = client.employees.get("emp_123")
assert isinstance(emp.created_at, datetime)
```

## Webhook

```python
from upcore.webhooks import verify_webhook

@app.post("/webhook")
def handle_webhook(request):
    verify_webhook(
        body=request.body,
        timestamp=request.headers["x-upcore-timestamp"],
        signature=request.headers["x-upcore-signature"],
        secret=os.environ["UPCORE_WEBHOOK_SECRET"],
    )
    # process event
```

## Özellikler

- Pydantic v2 modeller
- Sync + async clients
- httpx-based
- Auto retry
- Typed (mypy strict)

===PAGE id=sdk-go title=Go SDK pos=3===
# Go SDK

Go 1.23+.

## Kurulum

```bash
go get github.com/upcore/upcore-go-sdk
```

## Quick start

```go
package main

import (
    "context"
    "log"

    "github.com/upcore/upcore-go-sdk"
)

func main() {
    client := upcore.NewClient(upcore.Config{
        APIKey:      os.Getenv("UPCORE_API_KEY"),
        Environment: upcore.EnvProduction,
    })

    ctx := context.Background()
    employees, err := client.Employees.List(ctx, &upcore.EmployeeListParams{
        DepartmentID: upcore.String("dept_123"),
        Limit:        upcore.Int(50),
    })
    if err != nil {
        log.Fatal(err)
    }

    for _, emp := range employees.Data {
        log.Println(emp.Email)
    }
}
```

## Idiomatik tasarım

- Context-first API
- Functional options
- Typed errors (errors.Is)
- Zero allocations for hot paths

## Webhook

```go
import "github.com/upcore/upcore-go-sdk/webhook"

func handleWebhook(w http.ResponseWriter, r *http.Request) {
    event, err := webhook.ConstructEvent(r, secretKey)
    if err != nil {
        http.Error(w, "invalid signature", 401)
        return
    }
    switch event.Type {
    case "pulse.completed":
        // handle
    }
}
```

## Özellikler

- Fiber/Echo/chi uyumlu
- Context propagation
- Tracing (OpenTelemetry)
- Testify mock helpers (test-helpers paketi)

===PAGE id=ml-model-kartlari title=ML model kartları (Google Model Cards formatı) pos=1===
# ML model kartları (Google Model Cards formatı)

UpCore'da kullanılan ML modelleri için şeffaf model kartları.

## Google Model Card standart

Mitchell et al. (2019) tarafından önerilen standart format:
- Model detayları (versiyon, tarih, tür)
- Kullanım amacı
- Faktörler (demographic, environmental)
- Performans metrikleri
- Değerlendirme verileri
- Eğitim verileri
- Quantitative analiz
- Etik hususlar
- Öneriler ve uyarılar

## UpCore model kartları

1. [Burnout prediction](./burnout-prediction-kart) — tükenmişlik risk tahmini
2. [JD-R fit](./jd-r-fit-kart) — iş-çalışan uyum skoru
3. [Intervention recommendation](./intervention-recommendation-kart) — Thompson sampling öneri

## Versiyonlama

- Her model sürümü ayrı model card
- Versiyonlar aylık yayımlanır (retrain sonrası)
- Eski sürümler arşivde

## Güncelleme politikası

- Model retrained → yeni model card gerekli
- Feature set değişimi → yeni card
- Bias denetim sonrası güncelleme → minor revision

## Public yayınlama

UpCore model kartları public:
- Şeffaflık
- Müşteri due diligence
- Akademik karşılaştırma
- Düzenleyici uyum (EU AI Act, KVKK Madde 22)

===PAGE id=ml-burnout-prediction-kart title=Model Card — Burnout Prediction v2.1 pos=2===
# Model Card — Burnout Prediction v2.1

## Model detayları

- **Model adı:** burnout-prediction
- **Versiyon:** 2.1
- **Tarih:** 2026-04-15
- **Geliştirici:** UpCore ML Team
- **Kontakt:** ml-team@upcore.io
- **Tür:** Classification (binary — yüksek risk / değil)
- **Algoritma:** XGBoost Classifier + Platt scaling calibration
- **Framework:** Python 3.12, scikit-learn 1.4, xgboost 2.0

## Kullanım amacı

- **Birincil:** Pulse + özlük verilerinden 90 gün içinde tükenmişlik riski (BAT-TR ≥ 3.5) olasılığı tahmini
- **İkincil:** Retention risk tahmini (ayrılış olasılığı)
- **Kullanım dışı:**
  - İşten çıkarma kararı (KVKK Madde 22 yasak)
  - Tek başına zam/terfi kararı
  - Pozisyon atama

## Faktörler

### Demografik
- Cinsiyet: bias denetim değişkeni (model feature değil)
- Yaş: 5 bucket (18-25, 26-35, 36-45, 46-55, 56+)
- Bölge: Türkiye il gruplaması (7 coğrafi bölge)

### Mesleki
- Rol (IC / Manager / Director)
- Kıdem (ay)
- Departman

### Psikometrik
- BAT-TR puanı (son 3 ay ortalama)
- UWES-9 puanı
- JD-R denge skoru

## Performans metrikleri

| Metric | Değer | Std |
|---|---|---|
| AUC-ROC | 0.78 | 0.02 |
| Precision @ 90% recall | 0.62 | 0.03 |
| Recall @ 90% precision | 0.45 | 0.04 |
| Brier score (calibration) | 0.14 | 0.01 |
| F1 | 0.68 | 0.02 |

## Değerlendirme verileri

- **Test set:** 50 000 çalışan (20% holdout)
- **Source:** UpCore anonim agregat (2020-2025)
- **Ülke:** Türkiye
- **Sektör dağılımı:** Tech %30, finans %25, retail %15, üretim %15, kamu %15

## Eğitim verileri

- **Boyut:** 150 000 çalışan
- **Dönem:** 2020 Q1 - 2025 Q4 (5 yıl)
- **Etiketleme:** BAT-TR skor ≥ 3.5 → pozitif (30% base rate)
- **Ön işleme:** Missing imputation (median), outlier clipping (99th percentile), standart scaling

## Quantitative analiz

### Grup bazında AUC

| Grup | AUC |
|---|---|
| Kadın | 0.77 |
| Erkek | 0.79 |
| 18-35 yaş | 0.79 |
| 36-55 yaş | 0.78 |
| 56+ yaş | 0.71 (küçük n) |
| Tech sektör | 0.80 |
| Üretim sektör | 0.74 |

### Fairlearn sonuçları

- Disparate impact ratio (cinsiyet): 1.08 (acceptable, < 1.25)
- Equalized odds farkı: 0.03 (good)
- Demographic parity farkı: 0.05 (good)

## Etik hususlar

- **Risk:** Yanlış pozitif → çalışana gereksiz müdahale baskısı
- **Mitigasyon:** Tahmin tek başına karar değildir, İK uzmanı değerlendirir
- **Risk:** Tarihsel bias → devam eden ayrımcılık
- **Mitigasyon:** Fairness constraints eğitim sırasında, yıllık audit
- **Risk:** Data leakage (pulse anonim olsa bile agregat bireyi belirli yapabilir)
- **Mitigasyon:** k-anonimlik ≥ 5, differential privacy noise

## Öneriler ve uyarılar

- Model tahmini güven aralığı ile birlikte sunulur
- Çalışan kendi tahmin açıklamasını isteyebilir (SHAP, KVKK Madde 11/g)
- Yeni sektör / ülke için transfer öğrenme ayrı değerlendirme gerekir
- Retrain en az 3 ayda bir

## İzleme

- Production drift metric'leri (PSI, KS test)
- Aylık performans raporu
- Yıllık bias audit
- Model sürüm log: GitHub

===PAGE id=ml-jd-r-fit-kart title=Model Card — JD-R Fit v1.3 pos=3===
# Model Card — JD-R Fit v1.3

## Model detayları

- **Model adı:** jd-r-fit
- **Versiyon:** 1.3
- **Tarih:** 2026-03-20
- **Geliştirici:** UpCore ML Team
- **Tür:** Regression (0-100 fit skoru)
- **Algoritma:** Neural network (3-layer MLP)
- **Framework:** Python 3.12, PyTorch 2.3

## Kullanım amacı

- **Birincil:** Çalışan × rol eşleştirmesi için JD-R (Job Demands-Resources) uyum skoru
- **İkincil:** Kariyer yolu öneri
- **Kullanım dışı:** Otomatik işe alım / kovma

## Feature'lar

- Çalışan yetkinlik profili (Geliştirme modülü yetkinlik haritası)
- Rol gereksinimleri
- Çalışan kişilik profili (VIA 24, UpCap-TR)
- Rol iş talepleri / kaynakları profili
- Geçmiş performans
- Geçmiş bağlılık

## Performans

| Metric | Değer |
|---|---|
| MAE | 8.2 (0-100 ölçekte) |
| RMSE | 11.5 |
| R² | 0.64 |
| MAPE | 12.3% |

Ground truth: 12 ay sonra işte kalma + yüksek performans (2 kriter AND).

## Eğitim verisi

- 80 000 çalışan-rol eşleştirme
- 3 yıllık outcome gözlem
- Türkiye bazlı

## Açıklanabilirlik

SHAP value ile her tahmin açıklanabilir:
- "Skor 78/100 çünkü: özerklik seven + role yüksek özerklik, iletişim güçlü + role müşteri sunumu"

Top-3 feature her öneride sunulur.

## Etik

- Gelişim alanları **yol göstermek** için — engellenmek için değil
- Düşük fit skoru → rol hariç tutma yok, gelişim plan tetikleyici
- Rol başvurusunda skor bilgilendirme amaçlı (çalışan + İK görür)
- **Tek başına** karar değildir — mülakat + referans + iş örneği değerlendirilir

## Bias

- Cinsiyet demographic parity: 0.96
- Yaş grup fairness: 0.93
- Eğitim seviyesi: 0.88 (bazı bias var, gözlem altında)

## Öneriler

- Her 6 ayda retrain (model freshness)
- Şirkete özel fine-tuning opsiyonel (Enterprise)
- Rol değişim hızı yüksek organizasyonlar için yeniden kalibrasyon

===PAGE id=ml-intervention-recommendation-kart title=Model Card — Intervention Recommendation v3.0 pos=4===
# Model Card — Intervention Recommendation v3.0

## Model detayları

- **Model adı:** intervention-recommendation
- **Versiyon:** 3.0
- **Tarih:** 2026-04-01
- **Geliştirici:** UpCore ML Team
- **Tür:** Multi-armed bandit (contextual Thompson sampling)
- **Framework:** Custom (NumPy + PyTorch for gradient boosted contextual)

## Kullanım amacı

- **Birincil:** Tükenmişlik sinyali olan çalışana en uygun müdahale önerme
- **Keşif / sömürü dengesi:** Thompson sampling ile optimize
- **Kullanım dışı:** Klinik tanı, reçete yazma

## Algoritma detayı

- Her müdahale için **Beta(α, β)** posterior
- Context-aware: çalışan profili + durum özellikleri gradient boosted contextual ile
- Keşif için ε-greedy fallback %10
- Forgetting factor 6 ay

## Kataloğa giriş

Her yeni müdahale katalog maddesi:
- 10 vakaya kadar **uniform prior** (exploration)
- Sonra posterior'dan örneklem

## Performans

Tanı: Ortalama Cohen's d elde edilen müdahalelerde

| Metric | Değer |
|---|---|
| Mean Cohen's d | 0.47 |
| % müdahale d ≥ 0.3 | 62% |
| % müdahale d ≥ 0.5 | 41% |
| % müdahale zarar (d < 0) | 3% |
| Drop-out rate | 8% |

## Eğitim ve üretim veri

- **Bootstrap veri:** Akademik literatür meta-analiz (180 RCT)
- **Canlı veri:** Her müdahale sonrası posterior güncellenir
- **Retraining:** Ayda 1 batch, haftalık incremental

## Açıklanabilirlik

Her öneri için:
- Top-3 müdahale listesi + güven yüzdesi
- "Benzer profillerde son 12 vakada ortalama d=0.52" örnek
- Context feature'larının etkisi (SHAP)

## Etik

- **İnsan karar önceliği:** Öneri top-3, tek değil
- **Çalışan onay:** Açık rıza zorunlu
- **Geri çekilme:** Her an müdahale durdurulabilir
- **Eşit hizmet:** Bias audit demographic
- **Şeffaflık:** Çalışan "neden bu öneri" sorusunu sorabilir

## Bias denetim

- Cinsiyet fairness: 0.97 DI
- Yaş grup fairness: 0.94 DI
- Engellilik durumu: 1.00 DI (özel önem gösterildi)
- Etnik köken: opt-in veri — denetim yeterli örneklem varsa

## Öneriler

- Bir müdahalenin n ≥ 30 vaka olduğunda posterior stabil olur
- Az veri olan müdahaleler için keşif öncelikli (intended feature)
- Yeni sektöre girildiğinde ilk 100 vaka çok dikkatli gözlenmeli
- Klinik escalation triggers ayrı system (bu model değil)

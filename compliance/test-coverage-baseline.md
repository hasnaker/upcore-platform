# UpCore Test Coverage Baseline — 2026-04-22 (tur-2 güncel)

## Handler paketleri — özet

| Paket | Baseline | Tur-1 | Tur-2 |
|---|---:|---:|---:|
| tenant/handler | 32.1% | 44.8% | 44.8% |
| document/handler | 50.1% | 50.1% | 50.1% |
| ats/handler | 30.9% | 30.9% | 30.9% |
| auth/handler | 27.8% | 27.8% | 27.8% |
| audit/handler | 21.3% | 21.3% | **24.0%** |
| organization/handler | 14.3% | 14.3% | **16.2%** |
| assessment/handler | 11.4% | 11.4% | **16.5%** |
| notification/handler | 10.8% | 10.8% | **14.6%** |
| survey/handler | 8.6% | 8.6% | **14.3%** |
| intervention/handler | 9.1% | 9.1% | **14.1%** |
| leave/handler | 4.1% | 4.1% | **13.4%** |
| employee/handler | 8.8% (FAIL) | 8.9% | 8.9% |
| performance/handler | 0.0% | 0.0% | **7.7%** |
| mobility/handler | 0.0% | 0.0% | **7.6%** |
| bordro/handler | 0.0% | 0.0% | **4.6%** |
| billing/handler | 0.0% | 0.0% | 0.0% (DB ağır) |

## İş mantığı (pure logic) paketleri

| Paket | Baseline | Güncel |
|---|---:|---:|
| pkg/bordro | 86.1% | **89.1%** |
| pkg/saga | 0.6% | **55.6%** |
| pkg/webhooks | 0.0% | **22.9%** |
| pkg/featureflags | 0.0% | **45.2%** |
| pkg/tenantexport | 0.0% | 1.6% |
| pkg/tenantprovision | 0.0% | 9.1% |
| ats/video | 0.0% | **84.6%** |
| ats/domain | 26.6% | **55.6%** |
| billing/provider | 0.0% | **86.5%** |
| mobility/domain | 0.0% | yeni (pure const) |

## Tüm modüller sağlık durumu (2026-04-22)

- ✅ Build: 23/23 Go modülü temiz
- ✅ Test: FAIL/panic yok
- ✅ Web TypeScript: exit 0

---

(Aşağıdaki bölüm ilk ölçümün detay kaydı — tarihsel referans için korunuyor.)

# UpCore Test Coverage Baseline — 2026-04-22

İlk ölçüm. `go test -count=1 -cover ./...` her modülün kökünde çalıştırıldı.
Aşağıdaki rakamlar _statement coverage_'dır; path coverage değil.

Hedef (CI gate, #189):
- **Kritik paketler**: ≥ 70% (billing/provider, bordro/service+sgk, auth/jwt+rbac, tenant/handler, ats/service, pkg/event, pkg/saga, pkg/webhooks)
- **Handler paketleri**: ≥ 40%
- **Diğer**: rapor amaçlı, gate yok

## Özet — en yüksekten düşüğe

| Paket | Kapsama | Not |
|---|---:|---|
| api-gateway/config | 96.1% | konfigürasyon okuyucu |
| assessment/config | 95.0% | — |
| auth/rbac | 93.3% | rol matrisi testli |
| auth/config | 91.7% | — |
| assessment/event | 90.6% | — |
| pkg/bordro | 86.1% | ortak hesap kiti |
| assessment/domain | 84.5% | — |
| leave/calculator | 81.7% | iş günü + tatil tablosu |
| assessment/scoring | 80.6% | BAT-TR skor motoru |
| employee/domain | 78.9% | — |
| intervention/bandit | 78.0% | Thompson sampling |
| bordro/sgk | 77.4% | SGK bildirge builder |
| tenant/domain | 76.3% | — |
| ratelimit | 71.0% | redis limiter |
| auth/service | 70.2% | session + rbac glue |
| middleware (gateway) | 67.0% | — |
| document/esignature | 66.2% | DocuSign adapter |
| ats/cv | 66.7% | parser |
| proxy (gateway) | 66.1% | upstream dispatcher |
| api-gateway/event | 63.3% | — |
| assessment/service | 63.6% | — |
| organization/service | 60.3% | — |
| tenant/service | 52.8% | — |
| document/handler | 50.1% | — |
| leave/domain | 49.2% | — |
| middleware (assessment) | 48.5% | — |
| clerk adapter | 45.5% | webhook decode |
| jwt (auth) | 45.1% | HS256 + key rotation |
| jwt (gateway) | 42.4% | — |
| organization/domain | 43.7% | — |
| storage (document) | 41.7% | Azure Blob adapter |
| service (document) | 40.7% | — |
| performance/domain | 38.0% | — |
| repository (assessment) | 35.4% | — |
| event (bordro) | 33.9% | outbox |
| tenant/handler | 32.1% | admin endpoint'leri |
| domain (bordro) | 31.5% | — |
| service (leave) | 31.8% | — |
| ats/service | 28.6% | **kritik — #186** |
| service (employee) | 27.0% | — |
| ats/handler | 30.9% | — |
| employee/validator | 30.9% | — |
| domain (ats) | 26.6% | — |
| audit/handler | 21.3% | — |
| organization/handler | 14.3% | — |
| repository (employee) | 12.1% | — |
| assessment/handler | 11.4% | — |
| notification/handler | 10.8% | — |
| intervention/handler | 9.1% | — |
| employee/handler | 8.8% | **FAIL** — TestHandler_ListEmployees kırık |
| survey/handler | 8.6% | — |
| health (gateway) | 8.0% | — |
| leave/handler | 4.1% | — |
| auth/repository | 3.2% | — |

## 0% paketler — hiç test yok (öncelik sırasıyla)

### Kritik (test gerekli)
- **services/billing/**internal/{provider,handler,service}** — Iyzico/Stripe/saga. #184'te kapanacak.
- **services/bordro/internal/{service,handler,pdf,repository}** — payroll motor. #185'te.
- **services/ats/internal/{ingestion,linkedin,video,repository,event}** — #186.
- **services/intervention/internal/{service,repository,stats,event}** — öneri motoru sayısal çekirdek.
- **services/mobility/internal/*** — yeni servis, hiç test yok.
- **services/document/internal/antivirus** — clamd adapter.
- **services/employee/internal/{saga,storage,pdf,esign,featureflag}** — saga + blob yükleme.
- **packages/go/saga** — %0.6, cross-service kritik. #188'de.
- **packages/go/webhooks** — HMAC + event dispatch. #188.
- **packages/go/featureflags** — tenant override. #188.
- **packages/go/tenantprovision** — tenant onboarding saga. #188.
- **packages/go/tenantexport** — KVKK export job. #188.

### Orta öncelik
- `services/*/internal/cmd` (main.go), `db` (sqlx open), `config` bazıları, `middleware` bazıları — integration testi kapsamına girecek.

### Düşük
- `testsupport` paketleri — test yardımcıları, kendileri test edilmez.

## Kırık test (hemen düzelt)

**employee/internal/handler — TestHandler_ListEmployees** (handler_test.go:122–123)
- Beklenti: 2 kayıt; gerçek: 0. Muhtemelen repo mock'u güncel şema ile uyumsuz (migrations 038+ sonrası).
- #187 sprintine eklendi (tenant admin test'ten sonra gelecek).

## Sonraki adım

1. #184 Billing saga + provider test (en yüksek risk — finansal akış)
2. #185 Bordro calculator test (Türkiye'ye özel vergi/SGK kuralları doğruluk testi)
3. #188 Shared packages (saga/webhooks/featureflags) — 17 servisi etkiliyor
4. #186 ATS flow test
5. #187 Tenant admin test + employee handler fix
6. #189 CI gate — üstteki 5 iş tamamlanmadan aktif etme

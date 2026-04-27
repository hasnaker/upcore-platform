# mobility-service

İç mobilite, kariyer yolları ve yedekleme (succession) planlamasını yöneten Go mikroservisi.

## Sorumluluklar

- **Internal rotations** — çalışanın departman/rol değişikliği talep akışı (propose → approve/reject → active → completed)
- **Career paths** — disipline bağlı kariyer yolu şablonları (Junior → Mid → Senior adımları)
- **Succession planning** — kritik pozisyonlar için yedekleme planı + aday havuzu

## Tech stack

Go 1.23, Chi router, sqlx, PostgreSQL 16 (RLS), zerolog, viper, testify.

## Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | Public |
| GET | `/ready` | Public |
| POST | `/api/v1/mobility/rotations` | Tenant |
| POST | `/api/v1/mobility/rotations/{id}/approve` | Tenant |
| POST | `/api/v1/mobility/rotations/{id}/reject` | Tenant |
| POST | `/api/v1/mobility/rotations/{id}/complete` | Tenant |
| GET | `/api/v1/mobility/employees/{employeeId}/rotations` | Tenant |
| POST | `/api/v1/mobility/career-paths` | Tenant |
| GET | `/api/v1/mobility/career-paths?discipline=...` | Tenant |
| GET | `/api/v1/mobility/career-paths/{id}` | Tenant |
| POST | `/api/v1/mobility/career-paths/{id}/steps` | Tenant |
| POST | `/api/v1/mobility/succession-plans` | Tenant |
| GET | `/api/v1/mobility/succession-plans` | Tenant |
| GET | `/api/v1/mobility/succession-plans/{planId}/candidates` | Tenant |
| POST | `/api/v1/mobility/succession-plans/{planId}/candidates` | Tenant |

## Çevre Değişkenleri

| Var | Default | Açıklama |
|---|---|---|
| `PORT` | `8013` | HTTP port |
| `DATABASE_URL` | `postgres://.../upcore_dev` | PostgreSQL DSN |
| `ROTATION_COOLDOWN_DAYS` | `365` | Çalışan tekrar rotasyona girmeden önce bekleme |
| `SUCCESSION_POOL_MAX_SIZE` | `5` | Pozisyon başına aday üst sınırı |
| `CAREER_PATH_RECOMMEND_K` | `3` | Önerilecek kariyer yolu sayısı |
| `MIN_TENURE_DAYS` | `180` | İç rotasyon için asgari kıdem |

## Geliştirme

```bash
make tidy     # bağımlılık dondurma
make run      # localhost:8013
make test     # race-enabled
make vet
```

## Veritabanı

Migration: `database/migrations/021_mobility.up.sql` — 5 tablo, RLS aktif,
`app.tenant_id` GUC'sine bağlı tenant izolasyonu.

## Business rules

- **Cooldown:** bir çalışan son tamamlanan rotasyondan itibaren 365 gün bekler
  (env ile override)
- **Pool cap:** bir succession plan'da en fazla 5 aday (sıralı, rank bazlı)
- **Pool readiness:** `ready_now` / `ready_1y` / `ready_2y` — zamanı gelmiş adaylar önce
- **RLS:** tüm tablolar tenant-scoped; gateway `X-Tenant-ID` header'ı injector ile
  context'e geçer, repository `SetRLSTenant` ile GUC set eder (tx içinde)

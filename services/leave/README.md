# Upcore Leave Service

Turkish HR leave management microservice (4857 İş Kanunu uyumlu).
Handles 14 leave types, yıllık izin hesaplama (14/20/26 gün), approval workflow, resmi tatiller, and iCalendar export.

**Port:** `8006`

## Quick start

```bash
go mod tidy
go build ./...
go test ./...
go run ./cmd
```

## Environment

| Var | Default | Notes |
| --- | ------- | ----- |
| `PORT` | `8006` | HTTP listen port |
| `DATABASE_URL` | `postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable` | postgres DSN |
| `LOG_LEVEL` | `info` | zerolog level |
| `CARRY_OVER_DEFAULT_DAYS` | `10` | carry-over cap default |
| `PRO_RATE_FIRST_YEAR` | `false` | pro-rate entitlement for mid-year hires |
| `TEAM_OVERLAP_WARN_PCT` | `30` | warn when >N% of team is on leave |
| `REQUIRE_HR_APPROVAL_OVER_DAYS` | `5` | days threshold forcing HR second-stage approval |
| `MEDICAL_CERT_MIN_DAYS` | `3` | minimum consecutive hastalık days requiring medical certificate |

## 4857 İş Kanunu

Annual leave entitlement (Madde 53):

| Kıdem | Gün |
| ----- | --- |
| 1-5 yıl | 14 |
| 5-15 yıl | 20 |
| 15+ yıl | 26 |

Genç çalışan (<18) veya 50+ yaş: minimum 20 gün.

## Endpoints

- `GET  /api/v1/leaves/types` — list leave types
- `GET  /api/v1/leaves/balances/:employee_id?year=2026` — employee balances
- `POST /api/v1/leaves/balances/:employee_id/adjust` — HR manual adjustment
- `GET  /api/v1/leaves/requests` — list requests
- `POST /api/v1/leaves/requests` — submit new request
- `GET  /api/v1/leaves/requests/:id`
- `PATCH /api/v1/leaves/requests/:id` — update (pending/draft only)
- `DELETE /api/v1/leaves/requests/:id` — cancel
- `POST /api/v1/leaves/requests/:id/approve`
- `POST /api/v1/leaves/requests/:id/reject`
- `GET  /api/v1/leaves/holidays?year=2026`
- `GET  /api/v1/leaves/calendar.ics?start=...&end=...`
- `GET  /health`, `GET /ready`

## Architecture

```
cmd/main.go
internal/
  config/       -- viper-based env config
  db/           -- sqlx conn + raw queries
  domain/       -- entities, state machine, errors
  calculator/   -- 4857 hesaplama, resmi tatil takvimi
  repository/   -- persistence adapters
  service/      -- use cases (Leave, Approval, Balance, Calendar)
  event/        -- event publisher (Azure Service Bus-ready)
  handler/      -- HTTP handlers
  middleware/   -- auth + tenant scoping + logger
api/openapi.yaml
```

## Testing

Unit tests use in-memory fakes (see `service/testsupport_test.go`). Run:

```bash
go test ./...
```

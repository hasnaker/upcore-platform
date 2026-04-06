# Upcore Employee Service

Employee microservice for Upcore V1. Owns the `app.employees`,
`app.employment_history`, and `app.employee_contacts` tables and exposes
CRUD, full-text search, bulk CSV import, employment history, and emergency
contact management.

## Stack

- Go 1.23, Chi, sqlx, lib/pq
- PostgreSQL 16 with pg_trgm
- Zerolog, Viper, encoding/csv
- testify (unit tests)

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8003` | HTTP listen port |
| `DATABASE_URL` | postgres://… | Postgres DSN |
| `AUTH_SERVICE_URL` | `http://auth:8001` | URL of the auth service for RBAC |
| `IMPORT_BATCH_SIZE` | `500` | Batch size for CSV inserts |
| `IMPORT_MAX_ROWS` | `10000` | Upper bound on rows per import |
| `IMPORT_MAX_FILE_MB` | `10` | Upload size cap |
| `SERVICE_BUS_CONNECTION_STRING` | "" | Azure Service Bus (optional) |

## Endpoints

Prefixed with `/api/v1`.

### Employees
- `GET /employees` — paginated list with filters
- `POST /employees` — create
- `GET /employees/search?q=…` — full-text search
- `GET /employees/me` — current user's employee profile
- `GET /employees/{id}` — get one
- `PATCH /employees/{id}` — partial update
- `DELETE /employees/{id}` — soft-delete
- `POST /employees/{id}/terminate` — terminate
- `POST /employees/{id}/reinstate` — reverse termination
- `POST /employees/import` — bulk CSV import (Paraşüt format)

### Employment History
- `GET /employees/{id}/history`
- `POST /employees/{id}/history`

### Emergency Contacts
- `GET /employees/{id}/contacts`
- `POST /employees/{id}/contacts`
- `PATCH /employees/{id}/contacts/{cid}`
- `DELETE /employees/{id}/contacts/{cid}`

### Health
- `GET /health`
- `GET /ready`

## TCKN Validation

Uses the official Türk Kimlik Numarası checksum algorithm:

1. 11 digits; the first digit is non-zero.
2. `d10 = ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) mod 10`
3. `d11 = (d1+…+d10) mod 10`

The same algorithm is enforced at the DB level by
`app.is_valid_tckn()` as a CHECK constraint.

## CSV Import (Paraşüt format)

Expected header:

```
sicil_no,ad,soyad,email,tckn,dogum_tarihi,ise_baslama_tarihi,departman,pozisyon,yonetici_email
```

Date columns accept `YYYY-MM-DD`, `DD.MM.YYYY`, or `DD/MM/YYYY`. Rows with
invalid data are collected into `errors[]` in the import result; the rest
are still persisted.

## Events Published

All published through the Azure Service Bus envelope format:

- `employee.created.v1`
- `employee.updated.v1`
- `employee.terminated.v1`
- `employee.position.changed.v1`
- `employee.manager.changed.v1`
- `employee.deleted.v1`
- `employee.import.completed.v1`

## Development

```bash
make run        # start local dev server
make test       # run tests with race detector
make cover      # test with coverage summary
make vet        # go vet
make build      # compile binary into ./bin
make docker     # build container image
```

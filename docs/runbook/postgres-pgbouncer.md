# Runbook — PostgreSQL + PgBouncer

**Owner:** Platform / Hasan Aker · **Severity:** P0 (DB down = full platform down)
**Last updated:** 2026-04-24

---

## Mimari

```
17 Go servisi (each 50 pool slots)        2 Python ML FastAPI (each 20 slots)
        │                                         │
        └──────────► PgBouncer :6432 ◄────────────┘
                          │
                          │ (managed by Azure Postgres Flex)
                          ▼
                  PostgreSQL :5432
                  (max_connections = 200)
```

**Önceki durum:** 19 servis × ~50 pool → 950 teorik bağlantı. PostgreSQL 200
limit; connection storm'da çakılıyordu.
**Şimdi:** PgBouncer transaction pooling → 30-50 fiziksel bağlantı.

---

## Servis bağlantı stringi

### Runtime (tüm servisler, HTTP trafiği)

```bash
DATABASE_URL="postgres://upcoreadmin:${PW}@upc-prod-pg-flex.postgres.database.azure.com:6432/upcore_prod?sslmode=require"
```

- **Port 6432** zorunlu — PgBouncer. Pool mode: `transaction`.
- `?sslmode=require` — Azure private endpoint ile birlikte mTLS.

### Migrations (golang-migrate, bir seferlik DDL)

```bash
DATABASE_URL_DIRECT="postgres://upcoreadmin:${PW}@upc-prod-pg-flex.postgres.database.azure.com:5432/upcore_prod?sslmode=require"
```

- **Port 5432** zorunlu — PgBouncer transaction mode `SET SESSION` /
  `LISTEN/NOTIFY` desteklemez; migration session-level.
- CI workflow `db-migrate.yml` otomatik `5432`'ye bağlanır.

### ⚠️ Kural

Servisin `config.go` default'u `6432`. Eğer bir servis `PREPARE`, `LISTEN`, veya
`SET SESSION` kullanıyorsa:
- **Option A:** Transaction mode uyumlu hale getir (`PREPARE` yerine query'yi
  inline gönder).
- **Option B:** O servis için `DATABASE_URL` override ile 5432.

Go + sqlx standart query'leri PgBouncer transaction mode ile uyumludur.
`pgx` extended protocol (named statement prepare) varsayılan açık → `statement_cache_mode=describe` ile çalıştır.

---

## Azure Postgres Flex PgBouncer konfigürasyonu

`infrastructure/azure/modules/postgres.bicep` altında:

```
pgbouncer.enabled             = true
pgbouncer.pool_mode           = transaction
pgbouncer.max_client_conn     = 2000   # servisler × replica × 10
pgbouncer.default_pool_size   = 50     # per-db per-user
pgbouncer.min_pool_size       = 10
pgbouncer.server_idle_timeout = 600s   # 10 dk
pgbouncer.server_lifetime     = 3600s  # 1 saat, sızıntıları kapat
```

---

## Monitoring

| Metric | Threshold | Alert |
|---|---|---|
| `pgbouncer.client_connection_count` | > 1500 | P1 (ACA replica scale out) |
| `pgbouncer.server_connection_count` | > 150 (of 200 PG max) | P0 (pool exhaustion) |
| `pgbouncer.avg_query_time_ms` | > 500 | P2 (slow query review) |
| `postgres.max_connections_used` | > 180 (of 200) | P0 (pool mis-configured) |

Dashboard: `observability/dashboards/db-and-queue.json`.

---

## Sorun giderme

### 1. `FATAL: pgbouncer cannot connect to server`

**Sebep:** PG restart sonrası PgBouncer retry, ama credentials cached yanlış.
**Çözüm:**
```bash
az postgres flexible-server restart --name upc-prod-pg-flex -g upc-prod-rg
# 60 saniye bekle, sonra servisler otomatik reconnect
```

### 2. `prepared statement "xyz" does not exist`

**Sebep:** Bir servis `PREPARE` kullanıyor ama PgBouncer transaction mode
session'ı statement arasında değiştiriyor.
**Çözüm:** Servis DSN'ine ekle: `&statement_cache_mode=describe` (pgx) veya
`&prefer_simple_protocol=true`.

### 3. Migration 5432'de değil 6432'de çalıştırılmış

**Sebep:** `db-migrate.yml` yanlış port kullanmış.
**Çözüm:** `FAILED: LISTEN not supported in transaction pooling mode` log'unda
görünür. Workflow'da `:5432` kullandığından emin ol, tekrar başlat.

### 4. Connection storm sonrası PG 200 limit doldu

**Sebep:** PgBouncer bypass edilmiş, servis 5432'ye bağlanmış.
**Çözüm:**
```bash
# Hangi servis?
az postgres flexible-server show-connection-string --query "connections[*].application_name"
# O servis için ACA config'te DATABASE_URL port'unu 6432'ye çek
az containerapp update --name upc-prod-<svc> -g upc-prod-rg \
  --set-env-vars DATABASE_URL="postgres://...:6432/..."
```

---

## Test prosedürü (DR drill öncesi)

```bash
# 1. Staging'de bağlantı sayısını ölç
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname='upcore_staging';"
# Beklenen: 30-50

# 2. Load test başlat (k6 smoke)
k6 run tests/load/smoke.js

# 3. Tekrar ölç
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname='upcore_staging';"
# Beklenen: < 100 (PgBouncer pool + migration bağlantıları)

# 4. PgBouncer statleri
psql -p 6432 pgbouncer -c "SHOW STATS;" -U pgbouncer
```

---

## Referans

- [Azure Postgres Flex — PgBouncer](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-pgbouncer)
- [PgBouncer docs — pool modes](https://www.pgbouncer.org/config.html)
- [DEPLOY.md](../../DEPLOY.md)
- [docs/deploy/REGION_DECISION.md](../deploy/REGION_DECISION.md)

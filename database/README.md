# Upcore · Database

PostgreSQL 16 + pgvector, multi-tenant HR SaaS schema with Row-Level Security.

## Architecture

- Engine: PostgreSQL 16 (Azure Flexible Server in prod, `pgvector/pgvector:pg16` locally)
- Extensions: `uuid-ossp`, `pgcrypto`, `vector` (pgvector), `ltree`, `citext`, `pg_trgm`, `btree_gin`, `unaccent`, `pg_stat_statements`
- Schemas:
  - `app` — application data (tenants, employees, assessments, …)
  - `audit` — immutable append-only audit log (partitioned monthly)
  - `ml` — model registry, Bayesian posteriors, predictions
- Multi-tenancy: Row-Level Security using session GUC `app.tenant_id`
- Partitioning: monthly for `app.burnout_signals` and `audit.events`
- Migration tool: golang-migrate compatible format (`NNN_name.up.sql` + `.down.sql`)

## Directory Layout

```
database/
├── migrations/                 # 20 numbered migrations + rls_policies.sql
│   ├── 001_init_extensions.up.sql
│   ├── 001_init_extensions.down.sql
│   ├── 002_tenants.up.sql
│   ├── 002_tenants.down.sql
│   ├── ... (through 020)
│   └── rls_policies.sql        # Applied after all table migrations
├── seeds/                      # Dev seed data
│   ├── 001_dev_tenants.sql
│   ├── 002_dev_users.sql
│   ├── 003_intervention_catalog.sql
│   ├── 004_bat_items_tr.sql
│   ├── 005_copsoq_items_tr.sql
│   ├── 006_upcap_items_tr.sql
│   └── 007_turkish_leave_types.sql
├── Makefile
└── README.md
```

## Running Locally

### 1. Start infrastructure

```bash
cd ../infrastructure
docker compose up -d
docker compose ps       # wait until postgres is (healthy)
```

Services exposed:
- `postgres`  → `localhost:5432` (user `upcore`, db `upcore_dev`, pass `upcore_dev_password`)
- `redis`     → `localhost:6379` (pass `upcore_redis_dev`)
- `azurite`   → `localhost:10000` (Blob), `10001` (Queue), `10002` (Table)
- `mailhog`   → SMTP `localhost:1025`, UI `http://localhost:8025`

The Postgres container creates two extra roles on first boot:
- `upcore_app`   — application role, subject to RLS (password `upcore_app_dev`)
- `upcore_admin` — migrations role, BYPASSRLS (password `upcore_admin_dev`)

### 2. Run migrations

```bash
cd ../database
make migrate-up
make seed-dev
```

Or together:
```bash
make reset-db       # DROP schemas + migrate-up + seed-dev
```

### 3. Verify

```bash
make status
make psql

-- In psql:
\dn                          -- list schemas: app, audit, ml
\dt app.*                    -- list app tables
SELECT count(*) FROM app.tenants;
SELECT count(*) FROM app.leave_types WHERE tenant_id IS NULL;
SELECT count(*) FROM app.instruments;
```

## Common Operations

### Create a new migration

```bash
make migrate-new NAME=add_engagement_scores
# → migrations/021_add_engagement_scores.up.sql
# → migrations/021_add_engagement_scores.down.sql
```

### Apply a single migration manually

```bash
PGPASSWORD=upcore_dev_password psql -h localhost -U upcore -d upcore_dev \
    -f migrations/007_employees.up.sql
```

### Rollback last migration

```bash
PGPASSWORD=upcore_dev_password psql -h localhost -U upcore -d upcore_dev \
    -f migrations/007_employees.down.sql
```

### Tenant-scoped query (RLS)

Application connections MUST set the tenant context per session/transaction:

```sql
-- As upcore_app role (subject to RLS):
SET LOCAL app.tenant_id = '11111111-1111-1111-1111-111111111111';
SELECT * FROM app.employees;       -- Only returns acme-tr employees
```

The provided `app.current_tenant_id()` function reads this GUC and is used by all RLS policies.

### Immutable audit log

`audit.events` is append-only:
- `BEFORE UPDATE` and `BEFORE DELETE` triggers raise an exception.
- Writes happen only via `audit.log_row_change()` triggers attached to protected tables
  (`tenants`, `users`, `employees`, `assessments`, `intervention_assignments`,
  `leave_requests`, `documents`).

## Key Design Rules

| Rule | Enforcement |
|---|---|
| Every tenant-scoped table has `tenant_id UUID NOT NULL` as first column | Column order in CREATE TABLE |
| All tables have `id UUID PK` + `created_at` + `updated_at` | Base template |
| `updated_at` auto-maintained | `trg_*_updated_at` trigger on every table |
| Soft delete via `deleted_at TIMESTAMPTZ NULL` where applicable | Partial indexes `WHERE deleted_at IS NULL` |
| Enums as CHECK constraints, not PostgreSQL ENUM types | `CHECK (col IN ('a','b',...))` |
| TCKN validated algorithmically | `app.is_valid_tckn(text)` |
| pgvector HNSW index for intervention similarity | `idx_interventions_embedding_hnsw` |
| Audit log immutable | `app.immutable_row()` trigger |
| Partitioned tables: `burnout_signals`, `audit.events` | RANGE by month |

## Turkish Domain Specifics

- Leave types (`seeds/007_turkish_leave_types.sql`) come from **4857 sayılı İş Kanunu**
  (Labor Code), with legal references in the `legal_reference` column.
- Employee fields use Turkish names (`ad`, `soyad`, `dogum_tarihi`, `tckn`, `sgk_no`, …)
  to match existing HRIS conventions.
- Position definitions carry JD-R profile (`jdr_talepler`, `jdr_kaynaklar`) as JSONB.
- Psychometric instruments in Turkish:
  - **BAT-12-TR** (Koçak 2022, CC-academic)
  - **COPSOQ-III-TR** (Karagöl 2021, CC-BY-NC-SA 4.0)
  - **UpCap-TR** (Upcore 2024, based on Maddux CPC-12, CC-BY 4.0)

## Migration Summary

- 20 migrations (001 → 020) covering tenants, users, RBAC, org/positions, employees,
  contacts, leaves, documents, ATS, assessments, instruments, surveys, burnout signals,
  interventions, mobility, notifications, audit, and final indexes.
- `rls_policies.sql` enables Row-Level Security on all tenant-scoped tables.
- 7 seed files load dev tenants, users, intervention catalog, BAT-12 / COPSOQ / UpCap
  items, and 4857-compliant leave types.

## Production Notes

- Migrations in prod are **forward-only**. Reversing a migration requires a new
  forward migration.
- RLS is `FORCE`d on every table to prevent accidental bypass by table owners.
- Session-level `SET LOCAL app.tenant_id = '...'` MUST be set on every application
  connection before any query.
- Partitions for `burnout_signals` and `audit.events` are pre-created for
  current-3 to current+12 months and rotated via scheduled maintenance.

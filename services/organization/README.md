# organization-service

Department hierarchy (ltree), position definitions with JD-R profiles, teams,
reporting lines, and headcount snapshots for Upcore.

## Tech

- Go 1.23, Chi router, sqlx, PostgreSQL 16 (ltree + btree_gist)
- zerolog structured logging, viper configuration
- go-playground/validator
- Azure Service Bus (nop until configured)

## Run

```bash
cp .env.example .env
make run               # :8004
make test              # unit tests
make cover             # coverage summary
```

## Key Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET    | /api/v1/departments                       | Flat list |
| GET    | /api/v1/departments/tree                  | Nested tree |
| GET    | /api/v1/departments/{id}                  | Single dept |
| GET    | /api/v1/departments/{id}/subtree          | All descendants |
| GET    | /api/v1/departments/{id}/ancestors        | Parent chain |
| GET    | /api/v1/departments/{id}/children         | Direct children |
| POST   | /api/v1/departments                       | Create |
| PATCH  | /api/v1/departments/{id}                  | Update |
| POST   | /api/v1/departments/{id}/move             | Move subtree |
| DELETE | /api/v1/departments/{id}                  | Archive (if empty) |
| GET    | /api/v1/positions                         | List with filters |
| GET    | /api/v1/positions/{id}                    | Position + JD-R |
| POST   | /api/v1/positions                         | Create |
| PATCH  | /api/v1/positions/{id}                    | Update |
| PATCH  | /api/v1/positions/{id}/jdr                | Update JD-R only |
| DELETE | /api/v1/positions/{id}                    | Archive |
| GET    | /api/v1/teams                             | List teams |
| POST   | /api/v1/teams                             | Create |
| POST   | /api/v1/teams/{id}/members                | Add member |
| DELETE | /api/v1/teams/{id}/members/{employeeId}   | Remove member |
| POST   | /api/v1/reporting/set-manager             | Assign manager |
| GET    | /api/v1/reporting/manager/{id}/reports    | Direct reports |
| GET    | /api/v1/reporting/manager/{id}/team       | Full team tree |
| GET    | /api/v1/reporting/matrix                  | Dotted lines |
| GET    | /api/v1/headcount                         | Current snapshot |
| GET    | /api/v1/headcount/departments             | Per dept |
| GET    | /api/v1/headcount/trends                  | Trend (?period=3m) |
| POST   | /api/v1/headcount/snapshot                | Capture snapshot |
| GET    | /health, /ready                           | Probes |

## ltree

Efficient hierarchy operations rely on PostgreSQL's `ltree` extension:

- Subtree query — `WHERE path <@ 'root.tech' AND tenant_id = $1`
- Ancestors   — `WHERE path @> (SELECT path FROM departments WHERE id = $1)`
- Atomic move — rewrites all descendants in one `UPDATE` inside a transaction,
  preserving labels and prefixing the new parent path. Cycles are blocked at
  the service layer before the DB write.

## JD-R Profile

Each position carries a Job Demands-Resources profile (Bakker & Demerouti).

- **Demands** (1-10): workload, emotional, cognitive, time pressure, role
  conflict, role ambiguity.
- **Resources** (1-10): autonomy, feedback, social support, growth, skill
  variety, task significance.
- A burnout risk proxy is computed as `mean(demands) / mean(resources)`.

## Events

Published:
- `department.created.v1`, `department.updated.v1`, `department.moved.v1`,
  `department.deleted.v1`
- `position.created.v1`, `position.updated.v1`, `position.jdr_changed.v1`,
  `position.deleted.v1`
- `team.created.v1`, `team.updated.v1`, `team.member.added.v1`,
  `team.member.removed.v1`
- `reporting.manager_changed.v1`
- `headcount.snapshot_taken.v1`

## Configuration (env)

| Variable | Default |
|---|---|
| PORT | 8004 |
| APP_ENV | development |
| LOG_LEVEL | info |
| DATABASE_URL | postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable |
| MAX_DEPTH | 7 |
| SNAPSHOT_SCHEDULE | `0 5 0 * * *` (daily at 00:05 UTC) |
| CORS_ALLOWED_ORIGINS | * |

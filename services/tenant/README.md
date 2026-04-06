# tenant-service

Organization signup, subscription plans, billing webhooks, and usage tracking for Upcore.

## Tech

- Go 1.23, Chi router, sqlx, PostgreSQL 16
- zerolog structured logging
- viper configuration
- go-playground/validator
- Azure Service Bus (wired as Nop until configured)

## Run

```bash
cp .env.example .env   # create one from env vars below
make run               # serves :8002
make test              # runs unit tests
make cover             # coverage summary
```

## Key Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | /signup                  | public | Create tenant + 14d trial subscription |
| GET    | /plans                   | public | List active plans |
| GET    | /plans/{id}              | public | Plan detail |
| GET    | /tenants/me              | jwt    | Current tenant profile |
| GET    | /tenants/{id}            | jwt    | Tenant by id |
| PATCH  | /tenants/{id}            | jwt    | Update name/locale |
| DELETE | /tenants/{id}            | jwt    | Schedule soft-delete (+30d hard) |
| GET    | /subscriptions/current   | jwt    | Current subscription + plan |
| POST   | /subscriptions           | jwt    | Change plan |
| POST   | /subscriptions/cancel    | jwt    | Cancel at period end |
| POST   | /subscriptions/resume    | jwt    | Undo cancellation |
| PATCH  | /subscriptions/seats     | jwt    | Update seat count |
| GET    | /usage                   | jwt    | Current period usage counters |
| POST   | /webhooks/billing        | sig    | Stripe/Iyzico webhook receiver |
| GET    | /health                  | public | Liveness probe |

## Events

Published:
- `tenant.created.v1`, `tenant.activated.v1`, `tenant.suspended.v1`, `tenant.deleted.v1`
- `tenant.upgraded.v1`, `tenant.cancelled.v1`, `tenant.admin_invited.v1`
- `tenant.seat.limit.reached.v1`, `tenant.invoice.paid.v1`, `tenant.invoice.failed.v1`

Consumed (via `event.Consumer`):
- `employee.created.v1`, `employee.deleted.v1` -> increments/decrements employees metric
- `assessment.completed.v1` -> increments assessments metric

## Configuration (env)

| Variable | Default |
|---|---|
| PORT | 8002 |
| APP_ENV | development |
| LOG_LEVEL | info |
| DATABASE_URL | postgres://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable |
| TRIAL_DAYS | 14 |
| STRIPE_SECRET_KEY | (empty) |
| STRIPE_WEBHOOK_SECRET | (empty) |
| IYZICO_API_KEY | (empty) |
| IYZICO_SECRET_KEY | (empty) |
| IYZICO_WEBHOOK_SECRET | (empty) |
| CORS_ALLOWED_ORIGINS | * |

## Migrations

Migrations are in `migrations/` as `NNN_name.up.sql` / `.down.sql`. Run with your
preferred migration runner (`golang-migrate`, `dbmate`, etc.).

## Plans Catalog

Migration `002_plans.up.sql` seeds:

| id | tier | price (TRY/mo) | cap | modules |
|---|---|---|---|---|
| free | free | 0 | 25 | core_hris |
| starter | starter | 1500 | 100 | core_hris, assessment |
| growth | growth | 3000 | 500 | core_hris, assessment, burnout |
| platform | platform | 5000 | 1500 | core_hris, assessment, burnout, strengths, mobility |
| enterprise | enterprise | custom | unlimited | all |

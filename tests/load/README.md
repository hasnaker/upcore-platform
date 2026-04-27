# UpCore Load Tests (k6)

`tests/load/` holds [k6](https://k6.io) scenarios we run against **staging**
to validate UpCore can handle 10.000 çalışan tenant'ı + 500 concurrent user.

## Why k6?

- JavaScript scenarios (easier to read than JMeter XML)
- Built-in p95/p99 percentiles + threshold API
- Single static binary (no JVM)
- `xk6-dashboard` gives live HTTP graphs

## Environments

| Env        | Base URL                                  | Tenants | Users |
|------------|-------------------------------------------|---------|-------|
| staging    | https://staging.upcore.app                | 3       | 50    |
| load-large | https://load.upcore.app (spun up on demand)| 1 (10k) | 500   |

Staging can sustain baseline; load-large is for release regression.

## Running

```bash
brew install k6   # or scoop install k6 / apt install k6

K6_BASE_URL=https://staging.upcore.app \
K6_TENANT_ID=<uuid> \
K6_TOKEN=<bearer> \
  k6 run scenarios/employee_list.js
```

Dashboard mode:
```bash
k6 run --out dashboard scenarios/payroll_bulk_calculate.js
# browser auto-opens
```

## Thresholds

Each scenario declares thresholds. CI fails when any violate:

- `http_req_duration{endpoint:list}` p(95) < **500ms**
- `http_req_failed` rate < **1%**
- `checks` rate > **99%**

## Scenarios

| File                                  | Purpose                                       | Target                |
|---------------------------------------|-----------------------------------------------|-----------------------|
| `scenarios/auth_smoke.js`             | login + /auth/me loop                         | 10 VUs · 1 min        |
| `scenarios/employee_list.js`          | paginated list query (10k emp tenant)         | 100 VUs · 3 min       |
| `scenarios/payroll_bulk_calculate.js` | POST /runs/{id}/calculate-all-active          | 1 VU · cold request   |
| `scenarios/ats_funnel.js`             | requisition + candidate + application churn   | 50 VUs · 5 min        |
| `scenarios/dashboard_soak.js`         | executive dashboard endpoints                 | 500 VUs · 15 min      |

## CI Integration

GitHub Actions `.github/workflows/load.yml` (not yet) runs the smoke suite on
every push to `main`. Weekly full suite runs Mon 06:00 UTC.

Baseline reports land in `tests/load/reports/` (gitignored; pushed to blob).

# Go-Live Truth Freeze

Bu doküman canlıya çıkış sürecinde "tek doğruluk kaynağı" kuralını tanımlar.

## Scope of Truth

1. Kod davranışı için birincil kaynak: `apps/*`, `services/*`, `ml-services/*`, `database/*`.
2. API kontratı için birincil kaynak: servis bazlı `api/openapi.yaml`.
3. CI/CD doğruluğu için birincil kaynak: `.github/workflows/*`.
4. Plan referansı: `MEGA_PLAN_V3.md`, `DEEP_MODULE_SPEC.md`, `MEGA_SPEC_V2.md`.

Doküman ve kod çeliştiğinde, testle doğrulanmış kod esas alınır ve doküman kodu takip edecek şekilde güncellenir.

## Phase 0 Guards

1. Web API direct DB surface guard:
`pnpm check:web-api-db`
2. E2E smoke gate:
`pnpm test:e2e`
3. DB script chain:
`pnpm db:migrate` ve `pnpm db:seed`

## Header Standard (BFF)

Gateway/BFF çağrılarında aşağıdaki header seti zorunludur:

1. `X-Tenant-Id`
2. `X-User-Id`
3. `X-User-Role`
4. `X-Request-Id`

Development fallback'ları sadece lokal amaçlıdır (`DEV_TENANT_ID`, `DEV_USER_ID`, `DEV_USER_ROLE`).


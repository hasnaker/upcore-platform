# auth-service

Upcore V1 authentication & authorization microservice.

## Responsibilities

- Process Clerk webhooks (`user.created`, `user.updated`, `user.deleted`, `session.revoked`)
- Validate Clerk-issued RS256 JWTs using the JWKS endpoint (cached 1h)
- Enforce RBAC policies (role, action, resource) for other services
- Manage refresh-token sessions (create, rotate, revoke, list)
- Emit `auth.user.*` + `auth.session.*` domain events

## Tech stack

Go 1.23, Chi router, sqlx, golang-jwt/jwt/v5, zerolog, viper, PostgreSQL 16.

## Running locally

```bash
# dependencies
make tidy

# start postgres (from repo root)
docker compose -f infrastructure/docker-compose.yml up -d postgres

# apply migrations
DATABASE_URL=postgres://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable \
  make migrate

# run the service
PORT=8001 \
DATABASE_URL=postgres://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable \
  make run
```

## Tests

```bash
make test            # race-enabled
make test-cover      # with coverage
make vet             # static analysis
```

## Endpoints

| Method | Path                          | Auth     | Purpose                         |
|--------|-------------------------------|----------|---------------------------------|
| GET    | /health                       | Public   | Liveness probe                  |
| GET    | /ready                        | Public   | Readiness probe                 |
| POST   | /webhooks/clerk               | Svix HMAC| Clerk webhook receiver          |
| GET    | /api/v1/auth/me               | JWT      | Current user profile + roles    |
| GET    | /api/v1/auth/users/me         | JWT      | Alias for /me                   |
| GET    | /api/v1/auth/check            | JWT      | Permission check (for services) |
| POST   | /api/v1/auth/check            | JWT      | Permission check (body)         |
| GET    | /api/v1/auth/sessions/current | JWT      | Current session identity        |
| GET    | /api/v1/auth/sessions         | JWT      | List active sessions            |
| DELETE | /api/v1/auth/sessions/{id}    | JWT      | Revoke one session              |
| DELETE | /api/v1/auth/sessions         | JWT      | Revoke all sessions             |

## Environment variables

See [`.env.example`](../../.env.example) in the repo root, plus:

| Var                     | Default                                 | Description                    |
|-------------------------|-----------------------------------------|--------------------------------|
| `PORT`                  | `8001`                                  | HTTP listen port               |
| `DATABASE_URL`          | `postgres://upcore:upcore@...`          | PG connection DSN              |
| `CLERK_WEBHOOK_SECRET`  |                                         | Svix signing secret            |
| `CLERK_JWKS_URL`        | `https://api.clerk.dev/v1/jwks`         | JWKS endpoint                  |
| `CLERK_ISSUER`          | `https://clerk.upcore.app`              | Expected `iss` claim           |
| `JWT_AUDIENCE`          | `upcore-api`                            | Expected `aud` claim           |
| `ACCESS_TOKEN_TTL`      | `15m`                                   | Access token lifetime          |
| `REFRESH_TOKEN_TTL`     | `720h`                                  | Refresh token lifetime (30d)   |
| `JWKS_CACHE_TTL`        | `1h`                                    | JWKS cache TTL                 |

## Directory layout

```
cmd/main.go             # entry point
internal/
  config/               # viper config loader
  db/                   # sqlx connection, shared queries
  domain/               # entities, errors, context helpers
  clerk/                # Clerk webhook types + Svix verifier + dispatcher
  jwt/                  # JWKS cache + RS256 validator + claims
  rbac/                 # policy engine + default rules
  repository/           # sqlx persistence for users, sessions, roles
  service/              # business logic (auth, sessions)
  handler/              # HTTP handlers (chi)
  middleware/           # JWT, tenant, logging, recover
api/openapi.yaml        # OpenAPI 3.1 spec
migrations/             # SQL migrations (up/down)
```

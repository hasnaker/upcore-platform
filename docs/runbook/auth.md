# Runbook — auth

> Session, JWT, and SSO exchange service; if it fails, nobody can log in.

## Ownership
- **Primary owner**: Platform Identity squad
- **On-call rotation**: PagerDuty schedule `pd-identity`
- **Slack**: `#oncall-identity`
- **Escalation**: Identity lead → VP Eng → CTO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /api/v1/auth/login` | Clerk session exchange | 300 ms |
| `POST /api/v1/auth/refresh` | JWT rotation | 100 ms |
| `POST /api/v1/auth/sso/saml/acs` | SAML AssertionConsumer | 400 ms |
| `GET /api/v1/auth/me` | current user | 100 ms |
| `POST /api/v1/auth/logout` | revoke | 100 ms |

## Alerts
- **LoginFailureRate** — > 5% failed logins 5 min (not credentials) → page.
- **ClerkOutbound5xx** — Clerk API 5xx → page.
- **JWTSignFail** — signing key misconfig → page.
- **SAMLAssertionInvalid** — > 10 invalid assertions/min → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/auth/auth-overview`
- Datadog APM: `https://app.datadoghq.eu/apm/services/auth`

## Common failure modes
### 1. Clerk outage
Symptom: login redirects hang, Clerk status page red.
Fix: enable `AUTH_READONLY_MODE=true` via feature flag — existing sessions survive, new logins queued. Watch Clerk status; clear flag when green.

### 2. JWKS key rotation misconfig
Symptom: every request "invalid signature". Happens after ops rotates the key.
Fix: verify `JWT_SIGNING_KEY_ID` in SealedSecret matches Clerk dashboard; rollback deploy if mismatch.

### 3. SAML IdP misconfig (new tenant)
Symptom: one tenant cannot log in via SSO, all others fine.
Fix: check `tenant_sso_config` row for that tenant; compare `entity_id` and `acs_url` with IdP metadata.

### 4. Session DB bloat
Symptom: high p95 on `/me`; lots of `pg_bloat`.
Fix: run cleanup `DELETE FROM app.session WHERE expires_at < now() - interval '7 days'`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/auth`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/auth`
- Key rotation: `ops/scripts/rotate-jwt-key.sh`

## Contacts
- On-call: PagerDuty `pd-identity`
- Slack: `#squad-identity`
- Clerk account manager: via shared 1Password
- Security: `security@upcore.io`

# Clerk MFA + Passkey Configuration

**Owner:** Security Engineering
**Effective:** 2026-04-23 · **Pair:** POL-01, POL-11

## 1. Objectives
- Admin accounts: MFA **required** (Passkey preferred; TOTP acceptable; SMS banned).
- Employee accounts: MFA **required** for tenant admins; strongly recommended elsewhere.
- WebAuthn (Passkeys) enabled as the default second factor on sign-up.
- Session lifetimes: admin 8 h idle, employee 12 h idle.
- Suspicious login detection: Clerk built-in + UpCore custom rules.

## 2. Clerk Dashboard configuration

### 2.1 Authentication → Email, Phone, Username
- Email: enabled (verification required, link + code).
- Phone / SMS: **disabled** — phishing-resistant-only per POL-01.
- Username: disabled.

### 2.2 Authentication → Multi-factor
- Enabled factors:
  - [x] Authenticator app (TOTP)
  - [x] Passkey (WebAuthn)
  - [x] Backup codes
  - [ ] SMS (banned)
- MFA requirement: **required for all users** (applies to everyone; per-user override blocked in code below).

### 2.3 Authentication → Passkeys
- Relying party: `upcore.io`
- Allowed origins: `https://app.upcore.io`, `https://admin.upcore.io`
- User verification: `required`
- Attestation: `direct` (for audit); metadata statements verified against FIDO Alliance metadata service.

### 2.4 Sessions
- `Inactivity timeout`: 720 min (12 h) — employee panel.
- Admin panel enforces 480 min (8 h) via `<ClerkProvider afterSignOutUrl="/" />` wrapper reading `role=admin` claim and setting custom `signOutAfter`.
- `Maximum lifetime`: 7 days (all users).
- Same-site: `lax`; Secure: enforced.

### 2.5 Attacks & bots
- Bot protection: strict (Clerk Protect).
- Breached-password detection: enabled (Have I Been Pwned).
- Username / email enumeration protection: enabled.

### 2.6 Webhooks
- `user.created`, `user.updated`, `session.created`, `session.ended`, `session.revoked`, `email.created`
  → `https://api.upcore.io/webhooks/clerk` (Svix-signed).
- UpCore `audit` service records every session event.

## 3. Code hooks

### 3.1 Enforce MFA for admin roles
`apps/admin/src/middleware.ts` must redirect any authenticated user without verified MFA to `/mfa-setup`:

```ts
const { userId, sessionClaims } = auth();
const hasMfa = (sessionClaims as { has_mfa?: boolean }).has_mfa ?? false;
if (userId && !hasMfa) {
  return NextResponse.redirect(new URL("/mfa-setup", req.url));
}
```

### 3.2 Shortened session for admin
`apps/admin/src/lib/session.ts` reads `last_active_at` from Clerk JWT; if idle > 8 h, forces re-auth (`signOut()` + redirect to `/sign-in`).

## 4. Suspicious login detection

Handled by the new UpCore service `services/auth/internal/service/suspicious.go` (see file). Triggers when any of:
- Login IP geolocation > 500 km from last-known location within 1 h (impossible-travel).
- New device fingerprint on admin account (no prior seen within 90 days).
- Ten+ failed attempts on any single account in 5 min.
- Login from ASN on UpCore deny-list (anonymising proxies, known bots).

Actions:
- Challenge: force passkey step-up.
- Notify user via email (+in-app banner).
- Emit `session.suspicious` → `audit.events`.
- Rate-limit / block the source IP at Front Door if repeat.

## 5. Passkey enrollment UX

Admin panel presents a mandatory dialog on first login:
1. "UpCore requires MFA. Add a passkey (recommended) or authenticator app."
2. Detect `PublicKeyCredential.isConditionalMediationAvailable()` and prefer passkey.
3. Offer TOTP fallback (QR + secret).
4. Generate 10 single-use backup codes; user must download / copy.

## 6. Monitoring
- Daily: `report --mfa-coverage` (percentage of admin users with verified MFA; target 100%).
- Alerts: Datadog monitor on `mfa.disabled` audit events → Slack.

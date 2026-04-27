# Break-Glass Access Procedure

**Owner:** CISO
**Version:** 1.0 · **Effective:** 2026-04-23
**Paired policy:** POL-01 §5.4 · POL-07

## 1. Purpose
Provide emergency access to production when normal identity paths are unavailable (Clerk outage, Azure PIM unavailable, admin account lockout).

## 2. Break-glass accounts
Two accounts, stored physically sealed in envelopes:

| Account | Scope | Vault |
|---------|-------|-------|
| `break-glass-1@upcore.io` | Azure Global Admin + Postgres superuser | Physical safe — CISO office, İstanbul HQ |
| `break-glass-2@upcore.io` | Azure Global Admin + Postgres superuser | Physical safe — CTO residence, secondary |

Both accounts:
- Use FIDO2 hardware keys (YubiKey 5C NFC x2 per account).
- Password: 32-char, printed inside tamper-evident envelope.
- No keyboard-device retention (clean typed from printed copy).
- Excluded from Conditional Access + PIM (intentional).

## 3. Activation criteria
All must be true:
- Production impact SEV-1.
- Normal path (SSO + PIM) verified broken by IC.
- Two authorized approvers present (see §4).

## 4. Dual-control authorisation
Any **two** of the following may authorise use:
- CEO
- CTO
- CISO
- VP Engineering
- DPO (only for KVKK-mandated PII access)

Authorisation recorded in `#break-glass-log` Slack channel AND paper log in CISO safe.

## 5. Procedure
1. IC opens `#inc-<id>-break-glass`.
2. Two approvers join Zoom war room; verify identity on video.
3. Custodian opens sealed envelope (photograph the seal first).
4. Operator types credential from paper — never screen-share or paste from clipboard to cloud.
5. Perform minimum viable action, then log out.
6. Discard session, rotate credential immediately via `scripts/rotate-secrets.sh rotate break-glass-1` or break-glass-2.
7. Re-seal new credential into fresh tamper-evident envelope; return to safe.

## 6. Post-event
- Retroactive review by CISO within 24 h.
- Full audit log review of break-glass actions.
- Tabletop review: could the incident have been handled without break-glass?
- Entry in `compliance/break-glass/YYYY-MM-DD.md`.

## 7. Testing
- Quarterly fire-drill: approvers rehearse procedure without using the actual credential.
- Annual real test: rotate both accounts fully, verify new credential works, re-seal.

## 8. Audit and evidence
- Paper log in CISO safe (permanent).
- Slack `#break-glass-log` (retained 7 years).
- Rotation attestation (`scripts/rotate-secrets.sh --report`) with each use.
- Annual CISO report to board.

## 9. Prohibited
- Never photograph or otherwise digitise the password.
- Never paste into cloud clipboard / password manager.
- Never use for convenience; only genuine emergency.
- Willful misuse: termination + criminal referral (TCK 244).

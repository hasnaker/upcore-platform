# Playbook 05 — Credential Compromise

**Severity default:** SEV-2 (single user) / SEV-1 (admin or multi-user)

## Triggers
- Clerk suspicious-login alert (impossible travel, unknown device).
- User reports phish click or account takeover.
- GitHub advanced-security alert on leaked token.
- Threat-intel hit in dark-web dump.

## Immediate (0–15 min)
1. IC opens incident; pages CISO + CTO if admin involved.
2. Revoke all sessions for affected user:
   - Clerk: session-revocation API + password-reset required.
   - GitHub: revoke PATs + OAuth apps.
   - Azure: revoke access tokens + force MFA re-enrol.
3. Expire all API keys issued by / for the user.
4. Lock audit log WORM for the window of exposure.

## Investigate
1. Determine window: last trusted login → revocation.
2. Audit actions performed during window:
   ```sql
   SELECT action, resource_type, resource_id, occurred_at, ip
   FROM audit.events
   WHERE user_id = :uid AND occurred_at >= :t0 ORDER BY occurred_at;
   ```
3. Pivot: did attacker laterally move? Check for new API keys, new SSO sessions, privilege escalations.

## Contain
- Rotate any secrets the user could have extracted.
- If admin: rotate DB passwords, Azure service principal secrets, JWT signing keys (Clerk + UpCore).
- Block the IP / ASN used by the attacker at Front Door WAF.

## Communicate
| Audience | When | Owner |
|----------|------|-------|
| Affected user | T+0 (out-of-band, e.g. phone) | IC |
| Their manager | If actions were destructive | HR |
| CISO | T+15 min | IC |
| Affected customers | If tenant data accessed (Playbook 01) | DPO + Comms |

## Recover
- User re-enrols MFA with a fresh factor (prefer passkey).
- Anomalous actions reversed (manual review; no automatic undo).
- Monitor user + peers 30 days.

## Learn
- Root cause: phish, reused password, device malware, session theft?
- Enforce passkeys in at-risk cohort.
- Update phishing-sim scenarios if phish was successful.

## Evidence checklist
- [ ] Session ID + IP at compromise
- [ ] Full action log during window
- [ ] Revocation confirmations
- [ ] Secrets rotated list
- [ ] User re-enrol MFA confirmation

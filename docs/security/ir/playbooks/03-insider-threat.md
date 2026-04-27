# Playbook 03 — Insider Threat

**Severity default:** SEV-1 (malicious) / SEV-2 (negligent)
**Delicate: HR + Legal + DPO involved from T+0.**

## Triggers
- DLP alert: bulk PII export outside RBAC.
- Audit anomaly: dormant admin suddenly querying customer DB.
- Employee resignation + accessing data outside normal duties.
- Customer complaint about specific UpCore person.
- Threat-intel hit on credential in dark-web dump tied to employee account.

## Immediate (0–30 min)
1. IC pages CISO + CTO + HR Lead + Legal. Do NOT page the suspected individual.
2. Snapshot audit log `audit.events WHERE user_id = <id>` to evidence store.
3. Preserve endpoint state: MDM command to isolate + image laptop.
4. Do NOT revoke access yet if investigation needs to observe behaviour (with Legal approval).

## Contain
### Option A — overt containment (threat confirmed)
1. Suspend SSO + Clerk sessions.
2. Remove all IAM roles; freeze GitHub account.
3. MDM remote-wipe initiated after forensic image.
4. Physical-access revoked (badge).
5. Legal + HR notify employee per labour law; escort from office if on-site.

### Option B — covert monitoring (active investigation)
1. Enhanced logging on suspect's sessions (Bastion session recording ON).
2. No access changes visible to suspect.
3. Legal + CISO weekly review; maximum 14 days without reassessment.

## Investigate
- Determine data accessed + exfiltration path (download, screen capture, print, API).
- Affect assessment: which customers / tenants?
- Attribution: insider acting alone or part of external collusion?

## Communicate
| Audience | When | How | Owner |
|----------|------|-----|-------|
| CEO / CTO / CISO / HR / Legal | T+0 | Private channel | IC |
| DPO | If PII involved | — | Legal |
| Affected customers | Per Playbook 01 rules | — | Comms |
| Law enforcement | On CEO / Legal decision | SSM + Savcılık | Legal |
| Employee (suspect) | At time of overt containment | HR meeting | HR |

## Eradicate
- All secrets touched by suspect rotated.
- Dataset integrity verified.
- Tripwire monitoring for related accounts (peers, same team) 30 days.

## Recover & harden
- Tighten RBAC; enforce just-in-time access (PIM) for the role.
- Add DLP rule for the pattern exploited.
- Mandatory retraining for team if negligence contributed.

## Legal considerations
- TR İş Kanunu md. 25/II-e — haklı fesih for proven theft / breach of trust.
- TCK md. 239, 243, 244 — potential criminal referral.
- KVKK md. 12 — processor obligation to secure personal data.

## Evidence checklist
- [ ] Forensic image of laptop
- [ ] Audit log extract
- [ ] Network flow records
- [ ] HR + Legal sign-off on decisions
- [ ] Rotated secrets list
- [ ] Final report (confidential; Legal only)

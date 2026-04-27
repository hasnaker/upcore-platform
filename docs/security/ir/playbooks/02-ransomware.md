# Playbook 02 — Ransomware / Malware

**Severity default:** SEV-1
**Primary goal:** preserve data integrity; never pay ransom without CEO + Legal approval.

## Immediate (0–15 min)
1. IC declares SEV-1, pages CTO + CISO + Legal.
2. Do NOT reboot / shut down suspected hosts — may destroy in-memory evidence.
3. Network-isolate affected hosts (Azure NSG deny-all; VM tag `quarantine=true`).
4. Apply Azure immutable-blob lock on backups for the period (prevents encryption of backups).
5. Start Zoom war room; open `#inc-<date>-ransomware`.

## Contain (15 min – 2 h)
1. Check WORM backup integrity — do NOT overwrite with potentially-encrypted data.
2. Freeze all CI/CD pipelines to prevent image redeployment of compromised containers.
3. Revoke all production Kubernetes service account tokens.
4. Rotate kubectl admin credentials.
5. Disable SSO writeback from Active Directory if on-prem component is in scope.

## Investigate (parallel)
- Obtain sample of ransom note + encrypted file → Azure Sentinel; query Known-ransomware signatures (Trivy, Defender).
- Threat intel lookup on C2 domains / IPs.
- Determine initial vector (phish, RDP, supply-chain, exposed service).

## Eradicate (2–24 h)
1. Wipe and rebuild affected hosts from known-good images.
2. Rotate ALL long-lived credentials touched by the infected host.
3. Apply security patches to eliminate initial vector.
4. Force MFA re-enrolment for users on affected domain / account.

## Communicate
| Audience | When | How | Owner |
|----------|------|-----|-------|
| CEO / CTO / CISO / DPO / Legal | T+0 | Call | IC |
| Customers | If data access compromised → per Playbook 01 | — | Comms |
| Law enforcement | On Legal/CEO decision | Siber Suçlarla Mücadele (SSM) | Legal |
| Cyber insurance | ≤ 6 h | Policy hotline | Legal |

## Ransom
- Default answer: NO. Payment risks sanctions (OFAC) and encourages repeat.
- Payment requires CEO + CFO + Legal signoff AND documented inability to restore.
- Coordinate with insurer and law enforcement before any communication.

## Recover
- Restore from immutable backup to new infrastructure.
- Validate data integrity (row counts, checksums, test suite).
- Run full malware scan before re-joining network.

## Learn
- Root-cause analysis of initial vector.
- Harden (patching cadence, MFA, EDR deployment gaps).
- 30-day watch period with elevated logging retention.

## Evidence checklist
- [ ] Memory image of patient-zero host
- [ ] Ransom note (if any)
- [ ] IOC list (hashes, C2 domains, IPs)
- [ ] Timeline
- [ ] Insurance claim submission
- [ ] Post-restoration integrity report

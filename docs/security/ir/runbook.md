# UpCore Incident Response Runbook

**Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CISO
**Pair with:** POL-03 (Incident Response Policy) · NIST SP 800-61 r2

This runbook is the operational counterpart to POL-03. Start here when an alert fires.

---

## 1. Severity matrix

| SEV | Examples | Customer impact | Ack | Containment | Executive |
|-----|----------|-----------------|-----|-------------|-----------|
| **SEV-1** | Confirmed PII breach, ransomware on prod, multi-tenant outage > 1 h | Broad | 15 min | 1 h | CEO + CTO + DPO |
| **SEV-2** | Single-tenant data exposure, critical CVE exploited, major integration outage | Narrow | 30 min | 4 h | CTO + DPO |
| **SEV-3** | Contained intrusion attempt, internal tool outage, anomaly with likely cause | None | 2 h | 1 business day | CISO |
| **SEV-4** | Low-confidence alert, false-positive candidate | None | Next business day | N/A | On-call only |

### Who declares?
Any on-call engineer can declare. Upgrade any SEV within 30 min of new evidence. Downgrades require IC approval.

---

## 2. Roles during an incident

| Role | Assignee | Responsibilities |
|------|----------|------------------|
| **Incident Commander (IC)** | On-call security (primary), on-call platform (secondary) | Owns decisions, timeline, comms cadence |
| **Operations Lead (Ops)** | Platform on-call | Contain, eradicate, recover |
| **Communications Lead (Comms)** | CEO-delegated (default CTO) | Customer, regulator, press |
| **Legal / DPO** | Rotating | KVKK 72-h clock, law enforcement liaison |
| **Scribe** | Any engineer | Captures timeline in Slack thread |
| **Executive sponsor** | CEO (SEV-1) / CTO (SEV-2) | Authority to declare mass-breach notification |

---

## 3. Contact tree

| Who | Contact | Backup |
|-----|---------|--------|
| On-call security | PagerDuty `security-primary` | `security-secondary` |
| On-call platform | PagerDuty `platform-primary` | `platform-secondary` |
| CISO | Signal: redacted (see 1Password `contacts/exec`) | — |
| CTO | Signal: redacted | CISO |
| CEO | Signal: redacted | CTO |
| DPO | `dpo@upcore.io` + Signal | Legal counsel |
| External counsel | BTS Law, `+90-212-...` | — |
| KVKK Kurumu | `https://www.kvkk.gov.tr/` veri ihlali bildirim formu | — |
| Azure support | P1 ticket via portal | Premier account mgr |
| Clerk support | `security@clerk.com` + Slack Connect | — |
| Stripe | Radar fraud | — |

*(Exact phone numbers and keys live in 1Password `vault://incident`.)*

---

## 4. Canonical response flow

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │  DETECT      │──▶│ TRIAGE       │──▶│ CONTAIN      │──▶│ ERADICATE    │
 │ alert / report│   │ SEV + roles  │   │ isolate      │   │ patch / purge│
 └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
                                                                 │
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐          │
 │ LEARN        │◀──│ COMMUNICATE  │◀──│ RECOVER      │◀─────────┘
 │ post-mortem  │   │ customers +  │   │ restore +    │
 │ + actions    │   │ regulators   │   │ monitor 7 d  │
 └──────────────┘   └──────────────┘   └──────────────┘
```

### 4.1 Detect
Sources: Azure Sentinel, Snyk, Clerk, Datadog, customer reports at `security@upcore.io`, `phish@upcore.io`, bug bounty (phase 2).

### 4.2 Triage
1. Open `#inc-<YYYYMMDD>-<slug>` Slack channel.
2. IC paged via PagerDuty; assign Ops + Scribe.
3. Create Linear `INC-<n>` with severity, scope, initial hypothesis.
4. Start Zoom war room if SEV-1/2.

### 4.3 Contain
- Revoke compromised credentials (Clerk session revocation, API key rotation).
- Network isolate affected hosts (Azure NSG deny-all).
- Freeze writes to impacted tables (feature flag → maintenance mode).
- Apply Azure legal hold on related storage + audit log WORM lock.

### 4.4 Eradicate
- Patch vulnerability (hotfix PR, emergency-change per POL-08 §6).
- Remove persistence (cron, service accounts, SSH keys).
- Rotate all secrets touched by incident (see `scripts/rotate-secrets.sh --emergency`).

### 4.5 Recover
- Restore from clean backup (pre-incident RPO) via `scripts/dr-drill.sh --restore --point=<ts>`.
- Smoke test `scripts/smoke-test.sh prod`.
- Monitor 7 days for reinfection / repeat IOC.

### 4.6 Communicate
See playbook per incident type. KVKK clock = 72 h from confirmation.

### 4.7 Learn
- Blameless post-mortem within 5 business days (template `docs/security/ir/templates/post-mortem.md`).
- Action items in Linear with owners + due dates; tracked on security board.
- Policy updates reviewed by CISO.

---

## 5. Evidence preservation

- Azure Storage legal hold on blob containers involved.
- `audit.events` WORM partition for the period is immutable already; take a Merkle root snapshot `audit.worm_root` and sign it.
- `kubectl` manifest + container image digests captured.
- Network captures to Azure Storage with 7-year retention.
- Chain-of-custody log if law enforcement joins.

---

## 6. Runbook maintenance

- Review quarterly (next: see `docs/security/ir/review-log.md`).
- Update after every SEV-1/2.
- Test via tabletop exercise (template: `docs/security/ir/templates/tabletop.md`) quarterly; rotation of lead.

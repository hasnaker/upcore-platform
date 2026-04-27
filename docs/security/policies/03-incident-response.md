# Incident Response Policy

**ID:** POL-03 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CISO
**Review cadence:** annual + after every SEV-1 · **Frameworks:** SOC 2 CC7.3–CC7.5 · ISO 27001 A.5.24–A.5.28 · KVKK md. 12 (72 h bildirim)

## 1. Purpose
Define how UpCore detects, responds to, communicates, and learns from security incidents including data breaches, ransomware, insider threats, DDoS, credential compromise, and third-party outages.

## 2. Scope
All production systems, customer data, employee accounts, and sub-processor dependencies.

## 3. Roles
- **Incident Commander (IC)** — on-call security engineer; owns timeline and decisions.
- **Communications Lead (Comms)** — CEO delegate; owns customer, KVKK Kurumu, and press messaging.
- **Operations Lead (Ops)** — platform on-call; owns containment and recovery.
- **Legal / DPO** — regulatory notification decisions (72 h KVKK clock starts at confirmation).
- **Executive Sponsor** — CEO for SEV-1; CTO for SEV-2.

## 4. Severity matrix
| Severity | Definition | Response time | Who is notified |
|----------|-----------|---------------|-----------------|
| **SEV-1** | Confirmed PII breach, ransomware, or multi-tenant outage > 1 h | 15 min ack, 1 h containment | CEO, CTO, DPO, CISO, all customers |
| **SEV-2** | Single-tenant data exposure, critical vulnerability exploited, major integration outage | 30 min ack, 4 h containment | CTO, DPO, CISO, affected customer |
| **SEV-3** | Suspected intrusion contained at perimeter, internal tool outage, low-CVSS exploit attempt | 2 h ack, 1 business day | CISO, system owner |
| **SEV-4** | Anomaly, false-positive candidate | Next business day | On-call queue |

## 5. Phases (NIST SP 800-61)
1. **Preparation** — runbooks, contact tree, tabletop quarterly.
2. **Detection & analysis** — Azure Sentinel alerts, Clerk suspicious login, Snyk critical, customer report.
3. **Containment** — isolate affected services, revoke tokens, snapshot state before mutation.
4. **Eradication** — patch, rotate, purge.
5. **Recovery** — restore from clean backup, monitor for reinfection 7 days.
6. **Post-incident** — blameless review within 5 business days; action items tracked in Linear with owners.

## 6. Communication
- **Internal:** `#incident-<id>` Slack channel, Zoom war room, 30-min cadence updates.
- **Customer:** status page + email within 1 h of SEV-1 confirmation; full post-mortem within 7 days.
- **Regulator (KVKK):** DPO-led notification within 72 h of breach confirmation, via official form.
- **Press / public:** Comms Lead only; no individual statements.

## 7. Evidence preservation
- Logs frozen at first SEV-1 or SEV-2 alert (Azure legal hold applied).
- Chain of custody maintained if law enforcement involved.
- Audit log WORM partition locked per POL-13.

## 8. Runbook & playbooks
See `docs/security/ir/runbook.md` and `docs/security/ir/playbooks/` for operational procedures.

## 9. Audit and evidence
- Every declared incident: Linear ticket + post-mortem doc + IC signoff.
- Quarterly tabletop exercise report.
- Annual IR policy review signed by CISO.

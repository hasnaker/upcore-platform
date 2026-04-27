# Post-Mortem Template (Blameless)

**Incident:** INC-YYYYMMDD-NN
**Severity:** SEV-1 / SEV-2 / SEV-3
**Date of incident:** YYYY-MM-DD
**Post-mortem owner (IC):** <name>
**Reviewers:** CISO, CTO, affected team lead, DPO (if PII)

## 1. Summary
<2-3 sentences: what happened, impact, how we responded.>

## 2. Impact
- **Duration:** T0 (detection) → T1 (containment) → T2 (full recovery)
- **Affected tenants:** <count + list>
- **Affected users:** <count>
- **Data classes exposed:** <per POL-05>
- **Revenue impact:** <if any>
- **SLA credit:** <if any>

## 3. Timeline
| Time (UTC) | Event | Actor |
|------------|-------|-------|
| T-XX | <pre-incident signal> | |
| T0 | Alert fired | PagerDuty |
| ... | | |

## 4. Root cause
<5-whys or causal chain. NOT a person; a process / system / design.>

## 5. Contributing factors
- <factor 1>
- <factor 2>

## 6. What went well
- <good decision 1>
- <tool worked as designed>

## 7. What can be improved
- <detection gap>
- <runbook gap>
- <tool missing>

## 8. Action items (SMART)
| ID | Action | Owner | Due | Ticket | Priority |
|----|--------|-------|-----|--------|----------|
| AI-1 | | | | Linear | P0/P1/P2 |

## 9. Communication review
- Customer notification timing + content.
- KVKK notification (if applicable) — date, ID, outcome.
- Internal comms cadence.

## 10. Blameless statement
This post-mortem focuses on systems and processes. Individuals acted in good faith with the information and tooling available at the time. Our job is to make the next incident less likely or less severe, not to assign blame.

## 11. Appendix
- Linear INC-<n>
- Slack channel `#inc-<date>-<slug>`
- Audit log Merkle root snapshot at T0
- Vendor support case IDs

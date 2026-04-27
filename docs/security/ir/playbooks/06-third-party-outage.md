# Playbook 06 — Third-Party / Sub-processor Outage

**Severity default:** SEV-2 · SEV-1 if Azure-region-wide or auth provider down

## Triggers
- Azure Status Dashboard incident in EU-North.
- Clerk status page yellow/red.
- Stripe API failures (5xx spike).
- Postmark / SendGrid bounce surge.
- Monitoring: sudden 5xx from external dependency.

## Immediate (0–15 min)
1. IC confirms upstream incident via vendor status page; attach URL to Linear ticket.
2. Open `#inc-<date>-<vendor>`.
3. Identify blast radius: which UpCore features degraded?
4. Flip feature flags to graceful-degradation mode where possible:
   - Clerk down → maintenance banner + read-only sessions if still valid.
   - Postmark down → queue outgoing mail in Postgres (worker retries).
   - Stripe down → pause checkout, show "temporarily unavailable".

## Contain
- Enable circuit breakers at api-gateway → unhealthy sub-processor.
- Return cached / stale data where RFC-8246 allows.
- Preserve user-in-progress data (don't drop writes; queue them).

## Communicate
| Audience | When | How | Owner |
|----------|------|-----|-------|
| Status page | T+10 min | Public status | Comms |
| Customers | If impact > 30 min | Email + banner | Comms |
| Vendor | T+15 min | Enterprise support ticket | Ops |
| Exec | T+15 min for SEV-1 | Slack | IC |

## Monitor
- Poll vendor status every 5 min.
- Watch UpCore metrics; re-enable features as upstream recovers.
- Keep status page + customer comms current.

## Recover
- Drain queued writes (Postmark mailqueue, Stripe webhook replay).
- Verify data integrity post-restore.
- Verify no silent data loss on the gap.

## Learn
- Does UpCore need a secondary provider for this capability?
- Was our SLO compatible with vendor SLO?
- Was communication clear and timely? Post-mortem publishes on `/trust`.

## Special cases

### Azure EU-North regional outage
- Invoke DR plan (POL-04) — failover to EU-West.
- Customer SLA credit calculation begins (see MSA).

### Clerk compromise (auth provider itself breached)
- Escalate to SEV-1 data-breach playbook.
- Force global session revocation + MFA re-enrol.
- Coordinate with Clerk on evidence sharing.

## Evidence checklist
- [ ] Vendor status-page screenshots with timestamps
- [ ] Vendor incident ID
- [ ] UpCore impact timeline
- [ ] Feature-flag log
- [ ] Customer comms log
- [ ] SLA credit calculation (if applicable)

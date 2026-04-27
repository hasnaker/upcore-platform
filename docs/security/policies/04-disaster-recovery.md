# Disaster Recovery and Business Continuity Policy

**ID:** POL-04 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CTO
**Review cadence:** annual · **Frameworks:** SOC 2 A1.2 · ISO 27001 A.5.29–A.5.30, A.8.14

## 1. Purpose
Establish resilience objectives and operating procedures to recover UpCore services after a disaster (regional outage, ransomware, hardware failure, sub-processor failure).

## 2. Scope
Production workloads in Azure EU-North (Stockholm, primary) and Azure EU-West (Amsterdam, DR) — Postgres, object storage, Go services, Python ML, Clerk-managed identity.

## 3. Objectives
- **RTO (Recovery Time Objective): 4 hours** — customer-impacting services restored within 4 h of declared disaster.
- **RPO (Recovery Point Objective): 15 minutes** — maximum acceptable data loss = last WAL ship.
- **MTPD (Maximum Tolerable Period of Disruption): 8 hours** before regulatory notification.
- **Availability target: 99.9% quarterly** for Enterprise tier.

## 4. Strategy
- **Active-passive regional pair.** Primary = EU-North; warm-standby = EU-West.
- **Data:** Postgres streaming replication (async, <30 s lag) + 15-min WAL archive to immutable storage.
- **Backups:** daily full (Azure Backup, 35-day retention), weekly long-term (7 years cold, KVKK), cross-region copies.
- **Immutability:** WORM lock (legal-hold policy) on all backup blobs for 7 years.
- **Encryption:** AES-256 at rest (Azure SSE with CMK in Key Vault), TLS 1.3 in transit.

## 5. Roles
- **DR Coordinator (CTO delegate)** — declares disaster, owns comms.
- **Platform on-call** — executes failover runbook.
- **DBA on-call** — validates Postgres promotion.
- **Comms Lead** — external customer communication.

## 6. Procedures
### 6.1 Disaster declaration
Criteria met AND CTO approval:
- Primary region unreachable > 30 min, OR
- Data corruption confirmed, OR
- Ransomware indicators on > 2 hosts, OR
- Sub-processor (Azure/Clerk/Stripe) declares regional outage > 1 h.

### 6.2 Failover execution
1. Freeze writes to primary (api-gateway maintenance mode).
2. Promote EU-West Postgres replica via `scripts/dr-drill.sh --failover --region=eu-west`.
3. Flip DNS (Azure Front Door health probe) — 60 s TTL.
4. Warm cache + verify smoke test on ten critical endpoints.
5. Announce restoration via status page.

### 6.3 Post-disaster
- Root-cause analysis within 5 business days.
- Replay gap (if RPO breached) assessed; customers notified.
- Rebuild primary region; re-replicate; controlled failback on next maintenance window.

## 7. Testing
- **Quarterly DR drill** — table-top + partial restore via `scripts/dr-drill.sh`.
- **Annual full failover** — staging clone promoted in EU-West, RTO/RPO measured, customers pre-notified.
- **Monthly backup verification** — automated restore of random sample to ephemeral cluster.

## 8. Third-party dependencies
Documented in `docs/security/vendors/inventory.md`. Each tier-1 vendor must provide SOC 2 / ISO 27001 + DR attestation.

## 9. Audit and evidence
- Drill reports in `compliance/dr/drills/YYYY-QX.md`.
- Backup verification logs (`scripts/verify-backup.sh` output).
- Azure Monitor metrics: replication lag, backup completion.

# UpCore Disaster Recovery Plan

**Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CTO
**Paired policy:** POL-04 · **Test cadence:** quarterly drill + annual full failover

## 1. Objectives
| Metric | Target | Measurement |
|--------|--------|-------------|
| **RTO** | ≤ 4 hours | Time from declared disaster to customer-facing service restored |
| **RPO** | ≤ 15 minutes | Maximum data loss window from last WAL ship |
| **MTPD** | ≤ 8 hours | Absolute outage ceiling before regulatory notification |
| **Availability (Enterprise)** | 99.9% quarterly | Azure Monitor + status-page uptime |

## 2. Architecture

```
 ┌────────────────────────────┐       async streaming       ┌────────────────────────────┐
 │ PRIMARY: Azure EU-North    │ ──────────────────────────▶ │ DR: Azure EU-West          │
 │ Stockholm                  │         + WAL 15 min        │ Amsterdam                  │
 │ - AKS (17 Go + 4 Python)   │                             │ - AKS warm-standby         │
 │ - PostgreSQL 16 flex       │                             │ - PostgreSQL read replica  │
 │ - Azure Blob (Hot)         │ ─── GZRS geo-replication ──▶│ - Azure Blob (Hot)         │
 │ - Azure Key Vault          │ ─── geo-redundant ──────────│ - Azure Key Vault          │
 └──────────────┬─────────────┘                             └──────────────┬─────────────┘
                │                                                          │
                └──────── Azure Front Door (health probes, 60 s TTL) ──────┘
```

## 3. Backup strategy

| Artefact | Frequency | Retention | Location | Immutability |
|----------|-----------|-----------|----------|--------------|
| Postgres WAL | Continuous (15 min ship) | 35 days | Azure Blob GZRS | WORM |
| Postgres full | Daily 02:00 UTC | 35 days | Azure Backup | WORM |
| Postgres long-term | Weekly | **7 years** | Azure Blob Cool + legal hold | WORM |
| Object storage (documents) | GZRS continuous | 35 days | EU-North + EU-West | WORM |
| Object storage long-term | Monthly snapshot | **7 years** | Azure Blob Archive | WORM |
| Key Vault | Soft-delete 90 d + geo-redundant | Implicit | Key Vault | Purge protected |
| Audit log `audit.events` | In-place (partitioned) | **7 years** | Primary DB + WORM backup | DB trigger + WORM copy |

- **Encryption:** AES-256 Azure SSE with customer-managed keys (CMK) in Key Vault.
- **Verification:** `scripts/verify-backup.sh` runs nightly; alerts on checksum mismatch or missed WAL ship.

## 4. Disaster classes & responses

| Class | Example | Response |
|-------|---------|----------|
| **C1 — Single-service failure** | One AKS pod crash-looping | Auto-restart; no DR |
| **C2 — Zone failure** | EU-North zone 1 outage | Cross-zone redundancy absorbs; no DR |
| **C3 — Region failure** | EU-North full region outage | Failover to EU-West (this plan) |
| **C4 — Data corruption** | Bad migration, bug, insider | PITR to last good backup |
| **C5 — Ransomware on prod** | Encrypted hosts, ransom note | Restore from immutable backup to fresh cluster |
| **C6 — Sub-processor failure** | Clerk/Stripe down | Playbook 06 |

## 5. Failover procedure (C3 — Region)

1. **Declare:** CTO confirms + opens `#dr-<date>`.
2. **Freeze writes:** api-gateway maintenance mode.
3. **Promote Postgres:** `az postgres flexible-server replica promote --name pg-eu-west`.
4. **Switch DNS:** Azure Front Door backend pool → EU-West.
5. **Warm caches:** Redis + CDN prewarm script.
6. **Smoke test:** `scripts/smoke-test.sh --env=prod --region=eu-west`.
7. **Announce restoration:** status page + customer email.
8. **Post-incident:** RCA; plan controlled failback.

Automation: `scripts/dr-drill.sh --failover` executes steps 2–6 in dry-run or real mode.

## 6. Data corruption procedure (C4 — PITR)

1. Identify corruption window (audit log + customer report).
2. Provision side cluster; restore to T-ε pre-corruption.
3. Diff against current state; surface intended vs. unintended mutations.
4. Ops + Product decide: full rollback, selective replay, or manual cleanup.
5. Lock audit log WORM; preserve both states for forensics.

## 7. Roles & authority

| Role | Primary | Backup | Authority |
|------|---------|--------|-----------|
| DR Coordinator | CTO | CISO | Declare disaster |
| Platform Lead | On-call SRE | SRE peer | Execute failover |
| DBA | On-call DBA | CTO | Validate DB promotion |
| Comms Lead | CEO | CMO | Customer comms |
| DPO | DPO | Legal | Regulator comms |

## 8. Testing

| Test | Cadence | Method |
|------|---------|--------|
| Backup verification | Nightly | Automated restore + checksum |
| PITR spot check | Weekly | Random point → ephemeral cluster |
| DR tabletop | Quarterly | Scenario walk-through |
| DR drill (partial) | Quarterly | `scripts/dr-drill.sh --dry-run` end-to-end |
| Full failover | Annual | Real promote in off-peak window |

Results archived in `compliance/dr/drills/YYYY-QX.md` with RTO/RPO measurements.

## 9. Dependencies

Critical sub-processors (see `docs/security/vendors/inventory.md`):
- Azure (compute, DB, storage, Key Vault) — SLA 99.99%.
- Clerk (identity) — SLA 99.9%; fallback: emergency read-only mode.
- Stripe (billing) — SLA 99.9%; fallback: queue invoices.
- Postmark (email) — SLA 99.9%; fallback: queue outgoing mail.

## 10. Communication templates

### 10.1 Status page post
```
Status: Investigating
Service(s) affected: all
Message: We are investigating elevated error rates in our EU-North region. Customer data remains secure. Next update in 15 minutes.
```

### 10.2 Customer DR email (once failover complete)
```
Konu: UpCore servis bildirisi — <tarih>

Sayın müşterimiz,

<tarih> saat <UTC> arasında UpCore birincil bölgesinde (Azure EU-North) bir kesinti yaşandı. Felaket kurtarma planımız devreye alındı ve servisiniz <UTC> itibarıyla yedek bölgeden (EU-West) restore edildi.

Veri kaybı: <RPO değerlendirmesi>
Süre: <RTO değerlendirmesi>
Kök neden: <özet>

Detaylı post-mortem 7 iş günü içinde paylaşılacak. Sorularınız için: support@upcore.io

UpCore Ekibi
```

## 11. Dependencies on this plan
- Status page (`status.upcore.io`) must remain in a separate region / provider.
- 1Password break-glass vault (printed, sealed) in CISO + CTO safes.
- Runbook offline copies on secure USBs in two locations.

# Runbook — audit

> WORM audit log, KVKK DSR handler, consent register, ML-objection workflow. Compliance-critical.

## Ownership
- **Primary owner**: Security & Compliance squad
- **On-call rotation**: PagerDuty schedule `pd-security`
- **Slack**: `#oncall-security`
- **Escalation**: Security lead → CTO → DPO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /api/v1/audit/events` | append event (internal) | 100 ms |
| `GET /api/v1/audit/events` | search (keyset) | 500 ms |
| `POST /api/v1/audit/dsr` | new DSR | 500 ms |
| `POST /api/v1/audit/dsr/:id/execute-erasure` | fan-out | 2 s |
| `GET /api/v1/audit/consents` | list | 300 ms |
| `GET /api/v1/audit/export` | bulk export (cold) | async |

## Alerts
- **IngestionBacklog** — `audit_event_inbox` > 10k → page.
- **ArchiveWorkerLag** — events un-archived > 24h → page.
- **DSRSLABreach** — DSR > 25 days → page (30-day KVKK deadline).
- **WORMTamperDetect** — any UPDATE/DELETE on `audit.event` detected → PAGE CRITICAL.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/audit/audit-overview`
- KVKK DSR SLA dashboard: `https://grafana.upcore.internal/d/audit-kvkk`

## Common failure modes
### 1. Ingestion worker stuck
Symptom: backlog alert.
Fix: restart worker; check DB insert latency; scale workers via `kubectl scale deploy/audit-ingestion`.

### 2. DSR fan-out timeout
Symptom: erasure status "in_progress" > 24h.
Fix: see `docs/kvkk/hard-vs-soft-delete.md`; check ack topic for missing services; manual re-fan `ops/scripts/audit-dsr-refan.sh <dsr_id>`.

### 3. Archive worker cannot upload to Azure Blob
Symptom: cold archive falls behind 7-yıl retention timeline.
Fix: check Azure credentials; verify blob container `audit-archive-7y` exists; restart worker.

### 4. Attempt to UPDATE audit.event (tamper)
Symptom: DB trigger fires, event inserted into `audit_tamper_attempts`.
Fix: CRITICAL — page security@ immediately; freeze all audit-service admin access; run tamper-response runbook.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/audit`
- Rollback: audit service rollback REQUIRES backward-compatibility of event schema; consult Security lead.

## Contacts
- On-call: `pd-security` · Slack: `#squad-security`
- DPO: `dpo@upcore.io` · Security: `security@upcore.io`

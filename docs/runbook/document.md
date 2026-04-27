# Runbook — document

> Document vault (policies, contracts, payroll PDFs); Azure Blob backed, tenant-scoped.

## Ownership
- **Primary owner**: Platform Core squad
- **On-call rotation**: PagerDuty schedule `pd-platform`
- **Slack**: `#oncall-platform`
- **Escalation**: Platform lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/documents` | list | 300 ms |
| `POST /api/v1/documents` | upload (multipart) | 2 s |
| `GET /api/v1/documents/:id/download` | SAS redirect | 200 ms |
| `DELETE /api/v1/documents/:id` | soft-delete | 200 ms |

## Alerts
- **BlobUploadFail** — > 5% upload 5xx over 5 min → page.
- **SASExpired** — download 403 spike → warn.
- **VirusScanQueueLag** — unscanned > 1000 → warn.
- **StorageQuotaNear** — tenant > 95% of plan → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/document/document-overview`
- Azure Blob metrics: Azure Portal → storage account `upcoreprod`.

## Common failure modes
### 1. Blob storage throttled
Symptom: 503 "ServerBusy" from Azure.
Fix: increase storage account tier; enable write retry with exponential backoff (already in code, verify).

### 2. Virus scanner down (ClamAV)
Symptom: uploads accepted but stuck in `pending_scan`.
Fix: restart scanner deploy; run `ops/scripts/document-rescan-queue.sh`.

### 3. SAS token leak
Symptom: audit sees external IP downloading a signed URL.
Fix: revoke via `az storage account keys renew`; rotate downstream; see security runbook.

### 4. KVKK erasure mis-delete
Symptom: wrong document hard-deleted.
Fix: soft-delete retention 30 days — run `ops/scripts/document-restore.sh <id>` within window.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/document`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/document`
- Blob storage DR: region-replica failover via Azure Portal (RTO ≤ 1h).

## Contacts
- On-call: `pd-platform` · Slack: `#squad-platform`
- Azure support: via Enterprise Support portal
- Security: `security@upcore.io` · DPO: `dpo@upcore.io`

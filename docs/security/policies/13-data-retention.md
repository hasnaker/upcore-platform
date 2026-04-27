# Data Retention and Disposal Policy

**ID:** POL-13 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** DPO + CTO
**Review cadence:** annual · **Frameworks:** SOC 2 CC6.5 · ISO 27001 A.5.33 · KVKK md. 7, 138 / VERBIS

## 1. Purpose
Retain data only as long as legally or operationally necessary; dispose of it irreversibly afterwards.

## 2. Retention schedule
| Data class | Retention | Trigger | Reference |
|-----------|-----------|---------|-----------|
| Audit log (`audit.events`) | **7 years WORM** | Creation | KVKK md. 138, SOX, SOC 2 |
| Employee master record | Employment + 10 years | Termination | 6098 sayılı İş Kanunu, SGK |
| Payroll / bordro | 10 years | Pay period end | 213 sayılı VUK |
| Survey responses (BAT-TR, etc.) | 2 years | Response submission | DPIA commitment |
| Burnout signal time-series | 2 years (identified) + unlimited (aggregated) | Creation | DPIA |
| Intervention notes | Employment + 5 years | Creation | Customer contract default |
| ATS candidate (rejected) | 2 years | Rejection | GDPR / KVKK aydınlatma metni |
| Customer contract | Contract + 10 years | Contract end | TTK |
| Backup (hot) | 35 days | Creation | POL-04 |
| Backup (cold/WORM) | 7 years | Creation | KVKK + DR |
| Support tickets | 3 years | Closure | Operational |

## 3. Implementation
- Column `app.retention_policies(resource_type, retention_days, legal_basis)` drives automation.
- Nightly job `scripts/retention-cron.sh` purges expired rows (soft-delete then hard-delete after 30-day grace).
- Audit log WORM: monthly partition, immutability trigger, daily Merkle root published (migration `060_audit_log_worm.up.sql`).
- Backups WORM: Azure Blob immutability policy + legal hold.

## 4. Legal hold
- DPO or Legal may freeze retention via `scripts/legal-hold.sh --resource=X --reason=...`.
- Holds logged in `compliance/legal-holds/`.
- Release requires DPO signoff.

## 5. Right to erasure (KVKK md. 11)
Employee self-service portal accepts erasure requests. DPO validates within 30 days per KVKK. Audit log entries are preserved (with pseudonymized PII) per legal obligation.

## 6. Disposal
- Digital: cryptographic erase (rotate KEK) + SQL hard delete.
- Physical media (SSD, paper): certified destruction; certificate retained 3 years.

## 7. Audit and evidence
- Retention job logs retained 3 years.
- Monthly DPO attestation of retention + legal holds.
- Annual RoPA review.

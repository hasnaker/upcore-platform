# Change Management Policy

**ID:** POL-08 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** Engineering Manager
**Review cadence:** annual · **Frameworks:** SOC 2 CC8.1 · ISO 27001 A.8.32

## 1. Purpose
Ensure every change to production is reviewed, tested, approved, and reversible.

## 2. Scope
Source code, infrastructure-as-code, DB migrations, feature flags, configurations, sub-processor changes.

## 3. Principles
- Every change flows through a PR with at least one approver (two for security / payment / DB migration / auth flows).
- CI must be green before merge (lint, tests, coverage gate, security scans — see POL-12 SDLC).
- Deployments are automated via `.github/workflows/{staging,production}.yml`.
- Every prod release has a rollback plan; DB migrations must include `*.down.sql`.
- Emergency changes follow break-glass procedure with 24-h retroactive review.

## 4. Approval matrix
| Change type | Approvers | Window |
|------------|-----------|--------|
| Routine code | 1 peer | Continuous |
| Auth / payments / DB migration | 1 peer + 1 senior | Continuous |
| Infra (Terraform) | 1 peer + platform lead | Weekly window |
| Feature flag (tenant-wide) | 1 peer + product | Continuous |
| Security policy | CISO | Quarterly |
| Vendor / sub-processor | CISO + Procurement | On demand |

## 5. Deployment
- Staging deployed on merge to `develop`.
- Production deployed on release tag; canary 10% → 50% → 100% with SLO gates.
- Automated rollback trigger: 3-minute error spike, saturation, or p95 regression.

## 6. Emergency change
Incident Commander may bypass standard approvals; action logged; retroactive review by CISO within 24 h.

## 7. Audit and evidence
- GitHub branch protection logs, PR reviews, CI run IDs in every commit message.
- `compliance/changelogs/` quarterly summary.
- Drata connector on GitHub for continuous control monitoring.

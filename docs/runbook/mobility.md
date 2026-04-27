# Runbook — mobility

> Internal job marketplace, succession pipeline, career paths, rotation workflow.

## Ownership
- **Primary owner**: Talent squad
- **On-call rotation**: PagerDuty schedule `pd-talent`
- **Slack**: `#oncall-talent`
- **Escalation**: Talent lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/mobility/marketplace` | opportunities list | 300 ms |
| `POST /api/v1/mobility/marketplace/:id/apply` | apply | 400 ms |
| `GET /api/v1/mobility/succession/:position_id` | ready-now pool | 500 ms |
| `POST /api/v1/mobility/rotations` | rotation request | 400 ms |

## Alerts
- **HighErrorRate** — 5xx > 2% → page.
- **FitScoreLag** — fit score compute job backlog > 1000 → warn.
- **RotationStuck** — rotation pending approval > 14 days > 20 → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/mobility/mobility-overview`

## Common failure modes
### 1. Fit score stale
Symptom: UI shows 0% fit for candidates that should be strong.
Fix: trigger refresh via `POST /internal/fit-score/recompute/:tenant`.

### 2. Marketplace visibility leak (cross-department)
Symptom: user sees opportunity outside their allowed scope.
Fix: CRITICAL — page security@; audit `marketplace_visibility_rule`.

### 3. Career path graph cycle
Symptom: path editor 500 on save.
Fix: cycle check is client-side + server-side; inspect `career_path_node.parent_id` chain.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/mobility`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/mobility`

## Contacts
- On-call: `pd-talent` · Slack: `#squad-talent`
- Security: `security@upcore.io`

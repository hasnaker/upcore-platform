# Runbook — status

> Public status page (status.upcore.io), incident/maintenance timeline, SLA metrics, RSS/Atom feed.

## Ownership
- **Primary owner**: Platform Infra squad
- **On-call rotation**: PagerDuty schedule `pd-platform`
- **Slack**: `#oncall-platform`
- **Escalation**: Platform lead → VP Eng → CEO (public-facing)

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /status/components` | component list | 100 ms (cached) |
| `GET /status/incidents` | active + recent | 100 ms (cached) |
| `POST /status/incidents` | create (admin) | 500 ms |
| `GET /status/rss.xml` | RSS 2.0 | 200 ms |
| `GET /status/atom.xml` | Atom 1.0 | 200 ms |
| `GET /status/subscribers` | list (admin) | 200 ms |

## Alerts
- **StatusPublicDown** — `/status/components` 5xx → page CRITICAL (public-facing).
- **IncidentPostLate** — incident declared in PagerDuty but no public post in 15 min → page.
- **RSSStale** — feed `pubDate` > 24h during incident → warn.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/status/status-overview`

## Common failure modes
### 1. Cache layer misconfigured
Symptom: every `/status/components` hits DB; p95 balloons.
Fix: verify 30s TTL in-memory cache (`services/status/internal/handler/cache.go`); restart.

### 2. Incident created but not published
Symptom: internal declared, public still green.
Fix: set `published=true` and `visibility='public'` on incident row; clear cache.

### 3. Subscriber mass-unsubscribe (spam complaint)
Symptom: unsubscribe rate > 10%.
Fix: check the most recent incident post content; ensure plaintext email not HTML triggering spam.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/status`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/status`

## Contacts
- On-call: `pd-platform` · Slack: `#squad-platform`
- Marketing (for public-facing language): `#marketing`

# Runbook — notification

> Outbound channels: email, Slack, Teams, SMS, push; tenant Slack OAuth token vault.

## Ownership
- **Primary owner**: Integrations squad
- **On-call rotation**: PagerDuty schedule `pd-integrations`
- **Slack**: `#oncall-integrations`
- **Escalation**: Integrations lead → VP Eng

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /api/v1/notifications/send` | internal send | 300 ms |
| `POST /api/v1/integrations/slack/oauth/install` | Slack app install | 2 s |
| `POST /api/v1/integrations/slack/events` | Slack inbound webhook | 200 ms |
| `POST /api/v1/integrations/teams/events` | Teams inbound | 200 ms |

## Alerts
- **EmailProviderFail** — > 5% email 5xx → page.
- **SlackTokenDecryptFail** — KEK not set on connection → page (token leak risk).
- **QueueBacklog** — outbound queue > 10k → warn.
- **BounceRate** — > 3% over 1 h → warn (sender reputation).

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/notification/notification-overview`

## Common failure modes
### 1. Slack KEK not set on request
Symptom: logs show "slack token decrypt failed: app.slack_kek is null".
Fix: verify middleware `SET LOCAL app.slack_kek` is called per request — see `services/notification/internal/slack/oauth.go`. Recent deploys may have dropped it. Rollback.

### 2. Email provider suspension (SendGrid spam complaints)
Symptom: all tenant emails 550.
Fix: switch provider via feature flag; rehabilitate sender via SendGrid dashboard; notify CS.

### 3. Slack rate limit hit (429)
Symptom: tenant bot replies delayed.
Fix: backoff is automatic; if sustained, raise `slack.tier` on the app or shard workspaces.

### 4. Teams bot token expired
Symptom: 401 from Graph API.
Fix: force-refresh via `ops/scripts/teams-refresh-token.sh <tenant>`.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/notification`
- Rollback: `kubectl -n upcore-prod rollout undo deploy/notification`

## Contacts
- On-call: `pd-integrations` · Slack: `#squad-integrations`
- SendGrid / Postmark support via shared 1Password
- Security: `security@upcore.io`

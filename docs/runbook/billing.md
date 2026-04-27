# Runbook — billing

> Subscription, seat count, invoice, webhook from Stripe / İyzico; revenue-critical.

## Ownership
- **Primary owner**: Growth squad
- **On-call rotation**: PagerDuty schedule `pd-growth`
- **Slack**: `#oncall-growth`
- **Escalation**: Growth lead → CFO → CEO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `GET /api/v1/billing/subscriptions` | list | 300 ms |
| `POST /api/v1/billing/subscriptions` | create | 1 s |
| `GET /api/v1/billing/invoices` | list | 300 ms |
| `POST /webhooks/stripe` | Stripe webhook | 1 s |
| `POST /webhooks/iyzico` | İyzico webhook | 1 s |

## Alerts
- **WebhookFail** — provider webhook 4xx > 1% → page.
- **InvoiceOverdue** — overdue invoice count climbing → warn.
- **SeatCountDrift** — billing seats ≠ tenant seats → page.
- **PaymentProviderDown** — provider status page red → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/billing/billing-overview`
- Stripe Dashboard: `https://dashboard.stripe.com`

## Common failure modes
### 1. Stripe webhook signature mismatch
Symptom: 400 "invalid signature" on every webhook.
Fix: verify `STRIPE_WEBHOOK_SECRET` SealedSecret; rotate if endpoint recreated.

### 2. Seat drift (tenant > billing count)
Symptom: tenant added seats without sync.
Fix: run reconciliation `ops/scripts/billing-reconcile.sh <tenant>`; bill the delta.

### 3. Invoice PDF generation down
Symptom: invoice email sent without PDF.
Fix: check wkhtmltopdf pod; regenerate via `ops/scripts/billing-regen-invoice.sh <id>`.

### 4. Refund misapplied
Symptom: CS reports refund issued but payment still settled.
Fix: verify `billing_ledger_entry` balance; if mismatch, post manual correction entry with approval.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/billing`
- Rollback: requires `billing_ledger_entry` schema compatibility; consult Growth lead.

## Contacts
- On-call: `pd-growth` · Slack: `#squad-growth`
- Finance: `finance@upcore.io`
- Stripe / İyzico account manager: via shared 1Password

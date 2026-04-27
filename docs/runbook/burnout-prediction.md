# Runbook — burnout-prediction

> Python ML: XGBoost burnout risk predictor; SHAP explanations; Fairlearn bias monitoring. Regulated (KVKK Madde 22).

## Ownership
- **Primary owner**: Science squad (ML)
- **On-call rotation**: PagerDuty schedule `pd-ml`
- **Slack**: `#oncall-ml`
- **Escalation**: ML lead → Science lead → DPO

## Critical endpoints
| Path | Purpose | p95 budget |
|------|---------|------------|
| `POST /predict` | single-user risk | 300 ms |
| `POST /predict/batch` | bulk (async) | queue |
| `POST /explain/:user_id` | SHAP breakdown | 1 s |
| `GET /model/card` | current Model Card | 100 ms |

## Alerts
- **ModelDrift** — PSI > 0.2 vs baseline → warn.
- **FairnessFail** — demographic-parity violation > 10% → page.
- **CalibrationDrift** — Brier score degradation > 20% → page.
- **PredictFail** — 5xx > 1% → page.

## Dashboards
- Grafana: `https://grafana.upcore.internal/d/burnout/burnout-overview`
- ML monitoring: `https://grafana.upcore.internal/d/ml-drift`

## Common failure modes
### 1. Model artifact missing
Symptom: startup fails "no model.pkl".
Fix: verify blob storage path `ml-models/burnout/v{N}/model.pkl`; rollback deploy to previous model.

### 2. SHAP computation timeout
Symptom: `/explain` > 5 s.
Fix: reduce `max_display` to 5 features; cache per-user SHAP in Redis with 1h TTL.

### 3. Bias audit fail (Fairlearn)
Symptom: fairness alert for gender disparity.
Fix: CRITICAL — page DPO; freeze predictions for the affected demographic; trigger retraining (see `services/retraining`).

### 4. User objection filed (KVKK Madde 22)
Symptom: `audit.ml_objection` row created.
Fix: see `docs/kvkk/hard-vs-soft-delete.md` §ML objection; switch that user to human-in-the-loop mode.

## Recovery
- Restart: `kubectl -n upcore-prod rollout restart deploy/burnout-prediction`
- Rollback model version: update `BURNOUT_MODEL_VERSION` env; redeploy (no DB migration).

## Contacts
- On-call: `pd-ml` · Slack: `#squad-ml`
- KVKK / automated decisions: `dpo@upcore.io`
- Algorithm audit external partner: via shared 1Password

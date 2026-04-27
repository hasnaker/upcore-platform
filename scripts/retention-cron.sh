#!/usr/bin/env bash
# ============================================================================
# UpCore KVKK Retention Cron
# ----------------------------------------------------------------------------
# Her gece 03:00 (TR) çalıştırılır — kubernetes CronJob veya Azure Container
# App Scheduled Job olarak. app.retention_policies tablosundaki tüm enabled
# politikaları sırayla çalıştırır, audit_events'a INSERT log atar.
# ============================================================================

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL required}"

POLICIES=(
    "ats_candidate_6mo"
    "audit_events_7y"
    "tenant_deleted_90d"
    "survey_response_anon"
)

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] retention-cron starting (${#POLICIES[@]} policies)"

for P in "${POLICIES[@]}"; do
    echo "  → running $P"
    N=$(psql "$DATABASE_URL" -tA -c "SELECT app.run_retention_policy('$P');" || echo "ERROR")
    echo "    deleted: $N rows"
done

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] retention-cron done"

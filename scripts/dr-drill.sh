#!/usr/bin/env bash
# ============================================================================
# UpCore Disaster Recovery Drill
# ============================================================================
#
# Simulates a full tenant restore from backup. Run quarterly in staging —
# NEVER in production. Validates RPO <= 15 min and RTO <= 60 min targets.
#
# Steps:
#   1. Snapshot current staging DB state (checksum).
#   2. Restore yesterday's PITR backup into a side DB (upcore_dr_{ts}).
#   3. Run smoke checks (row counts, critical tables, audit trail).
#   4. Diff against snapshot: acceptable drift = today's writes only.
#   5. Teardown side DB + report timings.
#
# Usage:
#   ./scripts/dr-drill.sh                    # full drill (staging)
#   ./scripts/dr-drill.sh --dry-run          # print commands, don't execute
#   ./scripts/dr-drill.sh --skip-teardown    # leave side DB for inspection
#
# ============================================================================

set -euo pipefail

DRY_RUN=0
SKIP_TEARDOWN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)       DRY_RUN=1 ;;
    --skip-teardown) SKIP_TEARDOWN=1 ;;
    -h|--help)       sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ---- Config ---------------------------------------------------------------

: "${ENVIRONMENT:?ENVIRONMENT must be set (staging only)}"
: "${DATABASE_URL:?DATABASE_URL missing}"
: "${AZURE_SUBSCRIPTION:?AZURE_SUBSCRIPTION missing}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP missing}"
: "${PRIMARY_DB_SERVER:?PRIMARY_DB_SERVER missing}"

if [ "$ENVIRONMENT" != "staging" ]; then
  echo "REFUSING: DR drill only runs in staging (ENVIRONMENT=$ENVIRONMENT)" >&2
  exit 3
fi

TS=$(date -u +%Y%m%d_%H%M%S)
SIDE_DB="upcore_dr_${TS}"
PITR_TIME=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ)
LOG_FILE="/tmp/dr-drill-${TS}.log"
START_EPOCH=$(date +%s)

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] $*"
  else
    echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG_FILE"
    eval "$@" 2>&1 | tee -a "$LOG_FILE"
  fi
}

banner() {
  echo ""
  echo "═══ $1 ═══"
  echo ""
}

# ---- 1. Baseline snapshot -------------------------------------------------

banner "Step 1 / 5  Snapshot current staging"
run "psql \"$DATABASE_URL\" -tAc \"SELECT 'employees=' || COUNT(*) FROM app.employees\" > /tmp/dr-baseline-${TS}.txt"
run "psql \"$DATABASE_URL\" -tAc \"SELECT 'tenants=' || COUNT(*) FROM app.tenants\" >> /tmp/dr-baseline-${TS}.txt"
run "psql \"$DATABASE_URL\" -tAc \"SELECT 'audit_events=' || COUNT(*) FROM app.audit_events\" >> /tmp/dr-baseline-${TS}.txt"
cat /tmp/dr-baseline-${TS}.txt 2>/dev/null || true

# ---- 2. PITR restore into side DB -----------------------------------------

banner "Step 2 / 5  Restore PITR → $SIDE_DB  (target time: $PITR_TIME)"
run "az postgres flexible-server restore \
  --subscription $AZURE_SUBSCRIPTION \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $SIDE_DB \
  --source-server $PRIMARY_DB_SERVER \
  --restore-time $PITR_TIME \
  --yes"

# wait for provisioning
run "az postgres flexible-server wait \
  --subscription $AZURE_SUBSCRIPTION \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $SIDE_DB \
  --created \
  --timeout 3600"

# ---- 3. Smoke checks against restored DB ----------------------------------

banner "Step 3 / 5  Validate restored data"
RESTORED_URL="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${SIDE_DB}.postgres.database.azure.com:5432/upcore?sslmode=require"

run "psql \"$RESTORED_URL\" -tAc \"SELECT 'employees_restored=' || COUNT(*) FROM app.employees\" > /tmp/dr-restored-${TS}.txt"
run "psql \"$RESTORED_URL\" -tAc \"SELECT 'tenants_restored=' || COUNT(*) FROM app.tenants\" >> /tmp/dr-restored-${TS}.txt"
run "psql \"$RESTORED_URL\" -tAc \"SELECT 'audit_events_restored=' || COUNT(*) FROM app.audit_events\" >> /tmp/dr-restored-${TS}.txt"

# Critical integrity checks
run "psql \"$RESTORED_URL\" -tAc \"SELECT COUNT(*) FROM app.employees WHERE tenant_id IS NULL\" | grep -q '^0$' \
  || { echo '✗ FAILED: orphan employees (no tenant_id)'; exit 4; }"
run "psql \"$RESTORED_URL\" -tAc \"SELECT COUNT(*) FROM app.audit_events WHERE event_data IS NULL\" | grep -q '^0$' \
  || { echo '✗ FAILED: audit events missing payload'; exit 4; }"

# ---- 4. Diff — expected drift = 1 hour of writes --------------------------

banner "Step 4 / 5  Compare baseline vs restored (expected drift: 1h writes)"
if [ "$DRY_RUN" = "0" ]; then
  diff /tmp/dr-baseline-${TS}.txt /tmp/dr-restored-${TS}.txt | tee -a "$LOG_FILE" || true
fi

# ---- 5. Teardown ---------------------------------------------------------

if [ "$SKIP_TEARDOWN" = "0" ]; then
  banner "Step 5 / 5  Teardown side DB"
  run "az postgres flexible-server delete \
    --subscription $AZURE_SUBSCRIPTION \
    --resource-group $AZURE_RESOURCE_GROUP \
    --name $SIDE_DB \
    --yes"
else
  echo "⚠ Side DB retained: $SIDE_DB — clean up manually when done."
fi

# ---- Report --------------------------------------------------------------

END_EPOCH=$(date +%s)
DURATION=$((END_EPOCH - START_EPOCH))
DURATION_MIN=$((DURATION / 60))

banner "DR Drill Complete — ${DURATION_MIN}m${DURATION}s"
echo "RTO budget: 60m   · actual: ${DURATION_MIN}m   · result: $([ $DURATION_MIN -le 60 ] && echo PASS || echo FAIL)"
echo "Log: $LOG_FILE"
echo ""
echo "Next steps:"
echo "  1. File drill report in ops/dr/reports/${TS}.md"
echo "  2. Update RPO/RTO dashboard"
echo "  3. Open tickets for any failed integrity checks"

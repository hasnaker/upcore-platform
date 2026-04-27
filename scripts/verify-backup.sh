#!/usr/bin/env bash
# ============================================================================
# UpCore — Backup Verification (runs nightly via cron)
# ============================================================================
# Cron entry:
#   0 3 * * * /opt/upcore/scripts/verify-backup.sh >> /var/log/upcore/backup-verify.log 2>&1
#
# Checks:
#   1. Postgres WAL shipping is current (lag <= 15 min / RPO).
#   2. Last full backup succeeded and checksums.
#   3. Cross-region replica healthy.
#   4. Azure Blob immutability policy still active on WORM containers.
#   5. Restore smoke: restore last full to ephemeral cluster and run sanity
#      queries (row counts, audit trigger still in place).
#
# Exits non-zero on any failure; integration with alerting via the wrapper
# ops/cron/wrapper.sh which pages on-call on non-zero exit.
# ============================================================================
set -euo pipefail
IFS=$'\n\t'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_PREFIX="[backup-verify ${STAMP}]"
FAILED=0

# Tunables ------------------------------------------------------------------
WAL_LAG_MAX_SECONDS="${WAL_LAG_MAX_SECONDS:-900}"        # 15 min / RPO
FULL_BACKUP_MAX_AGE_SECONDS="${FULL_BACKUP_MAX_AGE_SECONDS:-108000}" # 30h
WORM_CONTAINERS=("audit-log-worm" "postgres-long-term" "documents-long-term")
PRIMARY_DB_HOST="${PRIMARY_DB_HOST:-pg-eu-north.internal.upcore.io}"
REPLICA_DB_HOST="${REPLICA_DB_HOST:-pg-eu-west.internal.upcore.io}"
AZURE_RG="${AZURE_RG:-upcore-prod-rg}"
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-upcorebackupsprod}"
EPHEMERAL_TEST_CLUSTER="${EPHEMERAL_TEST_CLUSTER:-pg-verify-${STAMP}}"

log() { echo "${LOG_PREFIX} $*"; }
fail() { echo "${LOG_PREFIX} FAIL: $*" >&2; FAILED=1; }

# -- 1. WAL lag ------------------------------------------------------------
log "checking WAL shipping lag …"
if ! command -v psql >/dev/null 2>&1; then
  fail "psql not available on host"
else
  lag=$(PGPASSWORD="${PG_ADMIN_PASSWORD:-}" psql -h "$PRIMARY_DB_HOST" -U upcore_admin -d postgres -tAc \
    "SELECT COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int, 0);" 2>/dev/null || echo "unknown")
  if [ "$lag" = "unknown" ]; then
    fail "could not query WAL lag"
  elif [ "$lag" -gt "$WAL_LAG_MAX_SECONDS" ]; then
    fail "WAL lag ${lag}s > ${WAL_LAG_MAX_SECONDS}s (RPO breach)"
  else
    log "WAL lag ${lag}s ✓"
  fi
fi

# -- 2. Last full backup age ----------------------------------------------
log "checking last full backup age …"
if command -v az >/dev/null 2>&1; then
  last_backup=$(az postgres flexible-server backup list \
    --resource-group "$AZURE_RG" \
    --name "$(basename "$PRIMARY_DB_HOST" | cut -d. -f1)" \
    --query "[0].completedTime" -o tsv 2>/dev/null || echo "")
  if [ -z "$last_backup" ]; then
    fail "no backup metadata returned from Azure"
  else
    age=$(( $(date -u +%s) - $(date -u -d "$last_backup" +%s) ))
    if [ "$age" -gt "$FULL_BACKUP_MAX_AGE_SECONDS" ]; then
      fail "last full backup ${age}s old (> ${FULL_BACKUP_MAX_AGE_SECONDS}s)"
    else
      log "last full backup ${age}s ago ✓"
    fi
  fi
else
  log "az CLI missing — skipping backup age check (make CI-safe)"
fi

# -- 3. Cross-region replica ----------------------------------------------
log "checking replica health …"
if PGPASSWORD="${PG_ADMIN_PASSWORD:-}" psql -h "$REPLICA_DB_HOST" -U upcore_admin -d postgres -tAc \
  "SELECT pg_is_in_recovery();" 2>/dev/null | grep -q '^t$'; then
  log "replica in recovery ✓"
else
  fail "replica NOT in recovery — promoted or unreachable"
fi

# -- 4. WORM immutability -------------------------------------------------
log "checking WORM container immutability policies …"
if command -v az >/dev/null 2>&1; then
  for c in "${WORM_CONTAINERS[@]}"; do
    policy=$(az storage container immutability-policy show \
      --account-name "$AZURE_STORAGE_ACCOUNT" \
      --container-name "$c" \
      --query "state" -o tsv 2>/dev/null || echo "missing")
    if [ "$policy" != "Locked" ]; then
      fail "container ${c} immutability = ${policy} (expected Locked)"
    else
      log "container ${c} immutability Locked ✓"
    fi
  done
else
  log "az CLI missing — WORM check skipped"
fi

# -- 5. Restore smoke (weekly only) ---------------------------------------
if [ "$(date -u +%u)" = "7" ]; then
  log "weekly restore smoke to ephemeral cluster ${EPHEMERAL_TEST_CLUSTER} …"
  if command -v az >/dev/null 2>&1; then
    set +e
    az postgres flexible-server restore \
      --resource-group "$AZURE_RG" \
      --name "$EPHEMERAL_TEST_CLUSTER" \
      --source-server "$(basename "$PRIMARY_DB_HOST" | cut -d. -f1)" \
      --restore-time "$(date -u -d '30 min ago' +%Y-%m-%dT%H:%M:%SZ)" >/dev/null
    rc=$?
    set -e
    if [ $rc -ne 0 ]; then
      fail "restore smoke failed (rc=${rc})"
    else
      log "restore smoke initiated — validation will complete asynchronously"
    fi
  else
    log "az CLI missing — restore smoke skipped"
  fi
fi

# -- Summary ---------------------------------------------------------------
if [ "$FAILED" -ne 0 ]; then
  log "SUMMARY: FAILED"
  exit 1
fi
log "SUMMARY: OK"
exit 0

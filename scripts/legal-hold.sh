#!/usr/bin/env bash
# ============================================================================
# UpCore — Legal Hold helper (POL-13)
# ----------------------------------------------------------------------------
# Applies or releases a legal hold on audit log partitions.
#
#   legal-hold.sh apply --from=YYYY-MM-DD --to=YYYY-MM-DD --reason="..."
#   legal-hold.sh release --id=<uuid>
#   legal-hold.sh list
# ============================================================================
set -euo pipefail

MODE="${1:-list}"
shift || true

FROM="" TO="" REASON="" ID=""
for a in "$@"; do
  case "$a" in
    --from=*)   FROM="${a#*=}" ;;
    --to=*)     TO="${a#*=}" ;;
    --reason=*) REASON="${a#*=}" ;;
    --id=*)     ID="${a#*=}" ;;
  esac
done

: "${DATABASE_URL:?DATABASE_URL missing}"
: "${LEGAL_APPROVER:?LEGAL_APPROVER missing (email of DPO/Legal approving this hold)}"

case "$MODE" in
  apply)
    [ -n "$FROM" ] && [ -n "$TO" ] && [ -n "$REASON" ] || {
      echo "usage: legal-hold.sh apply --from=YYYY-MM-DD --to=YYYY-MM-DD --reason='...'" >&2
      exit 2
    }
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
      INSERT INTO audit.legal_holds (reason, period_start, period_end, created_by)
      VALUES ('$REASON', '$FROM', '$TO', '$LEGAL_APPROVER')
      RETURNING id, reason, period_start, period_end, created_at;"
    echo "OK — partitions covering [${FROM}, ${TO}] are now frozen from retention deletion."
    ;;
  release)
    [ -n "$ID" ] || { echo "usage: legal-hold.sh release --id=<uuid>" >&2; exit 2; }
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
      UPDATE audit.legal_holds
         SET released_at = now(), released_by = '$LEGAL_APPROVER'
       WHERE id = '$ID' AND released_at IS NULL
      RETURNING id, reason, released_at;"
    ;;
  list)
    psql "$DATABASE_URL" -c "SELECT id, reason, period_start, period_end, created_by, created_at, released_at FROM audit.legal_holds ORDER BY created_at DESC;"
    ;;
  *)
    echo "unknown mode: $MODE" >&2
    exit 2 ;;
esac

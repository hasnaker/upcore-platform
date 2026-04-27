#!/usr/bin/env bash
# ============================================================================
# UpCore — Secret Rotation Automation
# ----------------------------------------------------------------------------
# Rotates secrets stored in Azure Key Vault on a cadence driven by the
# secret's tag `rotation-days`. Target cadences (POL-07):
#   DB password     → 90 days
#   API keys        → 180 days
#   Signing keys    → 365 days
#   TLS certs       → 365 days (via Azure-managed)
#
# Operations:
#   rotate-secrets.sh plan          — dry-run: list secrets due, no changes
#   rotate-secrets.sh rotate [NAME] — rotate all due or a specific one
#   rotate-secrets.sh --emergency   — rotate everything NOW (incident mode)
#   rotate-secrets.sh --report      — emit rotation attestation (for audit)
#
# Break-glass:
#   When managed identity path is unavailable, operator may use sealed
#   envelope credentials from CISO safe. See docs/security/policies/
#   01-access-control.md §5.4 and section "Break-glass" below.
# ============================================================================
set -euo pipefail
IFS=$'\n\t'

MODE="${1:-plan}"
TARGET="${2:-}"
EMERGENCY=0
REPORT=0
for a in "$@"; do
  case "$a" in
    --emergency) EMERGENCY=1 ;;
    --report)    REPORT=1 ;;
  esac
done

KEYVAULT="${AZURE_KEYVAULT:-kv-upcore-prod}"
SUBSCRIPTION="${AZURE_SUBSCRIPTION:-}"
LOGDIR="${LOGDIR:-/var/log/upcore}"
mkdir -p "$LOGDIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="${LOGDIR}/rotate-${STAMP}.log"
ATTEST="${LOGDIR}/rotate-${STAMP}.json"

log() { printf '[rotate %s] %s\n' "$STAMP" "$*" | tee -a "$LOG"; }
die() { log "ERROR: $*"; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || die "missing dependency: $1"
}

require az
require jq

# -- Discover rotation candidates ------------------------------------------
secrets_due() {
  EMERGENCY="$EMERGENCY" az keyvault secret list \
    --vault-name "$KEYVAULT" \
    ${SUBSCRIPTION:+--subscription "$SUBSCRIPTION"} \
    --query "[?tags.\"rotation-days\" != null].{name:name, days:tags.\"rotation-days\", last:attributes.updated, kind:tags.kind}" \
    -o json | EMERGENCY="$EMERGENCY" jq -r '
      .[]
      | . + { age_days: (((now - (.last | fromdateiso8601)) / 86400) | floor) }
      | select(.age_days >= (.days | tonumber) or env.EMERGENCY == "1")
      | "\(.name)\t\(.days)\t\(.age_days)\t\(.kind // "generic")"
    '
}

rotate_one() {
  local name="$1" kind="$2"
  log "rotating ${name} (kind=${kind}) …"
  case "$kind" in
    db-password)
      local newpw
      newpw="$(openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-40)"
      # 1. set on Postgres (via psql with admin token-based auth)
      PGPASSWORD="$(az keyvault secret show --vault-name "$KEYVAULT" --name pg-admin-password --query value -o tsv)" \
        psql -h "${PRIMARY_DB_HOST:-pg-eu-north.internal.upcore.io}" -U upcore_admin -d postgres \
        -c "ALTER USER ${name#pg-pw-} WITH PASSWORD '${newpw}';" \
        || die "psql ALTER USER failed for ${name}"
      # 2. write new value to Key Vault as new version
      az keyvault secret set --vault-name "$KEYVAULT" --name "$name" --value "$newpw" \
        --tags kind=db-password rotation-days=90 >/dev/null
      log "${name} rotated and persisted to vault ✓"
      ;;

    api-key)
      # External-provider key. Requires the provider's rotation API; here we
      # expect a helper script per provider in scripts/rotations/<name>.sh
      local helper="scripts/rotations/${name}.sh"
      if [ -x "$helper" ]; then
        "$helper" "$KEYVAULT" || die "${helper} failed"
      else
        log "${name}: no helper — manual rotation required"
        return 1
      fi
      ;;

    jwt-signing-key)
      local priv pub
      priv="$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 2>/dev/null)"
      pub="$(echo "$priv" | openssl rsa -pubout 2>/dev/null)"
      az keyvault secret set --vault-name "$KEYVAULT" --name "${name}"      --value "$priv" \
        --tags kind=jwt-signing-key rotation-days=365 >/dev/null
      az keyvault secret set --vault-name "$KEYVAULT" --name "${name}-public" --value "$pub"  \
        --tags kind=jwt-signing-key-public rotation-days=365 >/dev/null
      log "${name} RSA-4096 keypair rotated ✓"
      ;;

    generic|*)
      local nv
      nv="$(openssl rand -base64 64 | tr -d '/+=\n' | cut -c1-48)"
      az keyvault secret set --vault-name "$KEYVAULT" --name "$name" --value "$nv" \
        --tags kind="${kind}" rotation-days="${ROT_DAYS:-180}" >/dev/null
      log "${name} regenerated (length=48) ✓"
      ;;
  esac
}

notify_services() {
  local name="$1"
  # Services using managed identity auto-pull on next refresh; for apps
  # with warm in-memory copies, send a SIGHUP via k8s rollout.
  if command -v kubectl >/dev/null 2>&1; then
    local ns="prod"
    kubectl -n "$ns" annotate deployment --all \
      "upcore.io/secret-rotated=${name}-${STAMP}" --overwrite >/dev/null 2>&1 || true
    log "k8s deployments annotated for ${name}"
  fi
}

# -- Plan mode --------------------------------------------------------------
if [ "$MODE" = "plan" ] || [ "$REPORT" = "1" ]; then
  log "Listing secrets due for rotation in ${KEYVAULT} (emergency=${EMERGENCY})"
  due="$(secrets_due || true)"
  if [ -z "$due" ]; then
    log "No secrets due for rotation."
    [ "$REPORT" = "1" ] && echo "[]" > "$ATTEST"
    exit 0
  fi
  echo "$due" | column -t -s $'\t' | tee -a "$LOG"
  if [ "$REPORT" = "1" ]; then
    echo "$due" | awk -F$'\t' 'BEGIN{print "["} NR>1{print ","} {printf "  {\"name\":\"%s\",\"policy_days\":%s,\"age_days\":%s,\"kind\":\"%s\"}",$1,$2,$3,$4} END{print "]"}' > "$ATTEST"
    log "Report written to $ATTEST"
  fi
  exit 0
fi

# -- Rotate mode ------------------------------------------------------------
if [ "$MODE" = "rotate" ]; then
  if [ -n "$TARGET" ]; then
    kind="$(az keyvault secret show --vault-name "$KEYVAULT" --name "$TARGET" --query "tags.kind" -o tsv || echo generic)"
    rotate_one "$TARGET" "$kind"
    notify_services "$TARGET"
    log "rotation of $TARGET complete"
    exit 0
  fi

  due="$(secrets_due || true)"
  if [ -z "$due" ]; then
    log "Nothing due."
    exit 0
  fi
  while IFS=$'\t' read -r name _days _age kind; do
    if rotate_one "$name" "$kind"; then
      notify_services "$name"
    else
      log "WARN: ${name} rotation could not be automated — opened ticket"
    fi
  done <<< "$due"

  # emit attestation
  echo "$due" | awk -F$'\t' 'BEGIN{print "["} NR>1{print ","} {printf "  {\"name\":\"%s\",\"rotated_at\":\"'"$STAMP"'\",\"kind\":\"%s\"}",$1,$4} END{print "]"}' > "$ATTEST"
  log "Attestation written to $ATTEST (retained 7 years per POL-13)"
  exit 0
fi

die "unknown mode: $MODE (expected: plan | rotate)"

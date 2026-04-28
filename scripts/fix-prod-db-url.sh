#!/usr/bin/env bash
# fix-prod-db-url.sh — propagate URL-encoded DATABASE_URL secret across all
# Container Apps so they restart against the corrected Key Vault value.
#
# Symptom this fixes:
#   pgx: parse "postgres://upcoreadmin:l6LYDHiDw8$k@..." invalid userinfo
# The KV secret `db-url` was patched with URL-encoded password (e.g.
# "l6LYDHiDw8%24k") but only `upcore-survey` and `upcore-notification`
# were restarted. The remaining 14 services keep the previous revision's
# resolved value cached in their environment until they restart.
#
# Usage:
#   AZ_RG=upcore-prod-neu KV_NAME=upcore-prod-kv ./scripts/fix-prod-db-url.sh
#
# Optional: APPLY=1 to actually run; default is dry-run.
set -euo pipefail

: "${AZ_RG:=upcore-prod-neu}"
: "${KV_NAME:=upcore-prod-kv}"
: "${APPLY:=0}"

SERVICES=(
  upcore-auth
  upcore-tenant
  upcore-employee
  upcore-organization
  upcore-leave
  upcore-document
  upcore-survey
  upcore-assessment
  upcore-notification
  upcore-audit
  upcore-intervention
  upcore-mobility
  upcore-ats
  upcore-billing
  upcore-bordro
  upcore-performance
  upcore-status
  upcore-api-gateway
)

run() {
  if [[ "$APPLY" == "1" ]]; then
    echo "[apply] $*"
    eval "$@"
  else
    echo "[dry-run] $*"
  fi
}

echo "Resource group: $AZ_RG"
echo "Key Vault    : $KV_NAME"
echo "Apply mode   : $APPLY  (set APPLY=1 to mutate)"
echo

# 1. Make sure the KV secret is URL-encoded. Print but don't override.
echo "== 1) Inspect KV secret 'db-url' =="
current=$(az keyvault secret show --vault-name "$KV_NAME" --name db-url --query value -o tsv 2>/dev/null || echo "")
if [[ -z "$current" ]]; then
  echo "WARN: db-url secret not found in $KV_NAME — aborting."
  exit 1
fi
mask="${current/upcoreadmin:*@/upcoreadmin:***@}"
echo "current value (masked): $mask"
if [[ "$current" == *'$'* ]]; then
  echo "ERROR: KV value still contains a raw '\$' — the password must be URL-encoded (e.g. \$ -> %24)."
  echo "       Update the secret first:  az keyvault secret set --vault-name $KV_NAME --name db-url --value '<encoded url>'"
  exit 2
fi
echo "OK: KV value looks URL-encoded (no raw '\$')."
echo

# 2. For each service, restart its latest active revision.
echo "== 2) Restart Container App revisions =="
for svc in "${SERVICES[@]}"; do
  echo "-- $svc"
  rev=$(az containerapp revision list -g "$AZ_RG" -n "$svc" \
    --query "[?properties.active].name | [0]" -o tsv 2>/dev/null || echo "")
  if [[ -z "$rev" ]]; then
    echo "   (no active revision found, skipping)"
    continue
  fi
  run "az containerapp revision restart -g \"$AZ_RG\" -n \"$svc\" --revision \"$rev\""
done

echo
echo "== 3) Wait + tail logs (last 30 lines / service) =="
for svc in "${SERVICES[@]}"; do
  echo "------ $svc ------"
  if [[ "$APPLY" == "1" ]]; then
    az containerapp logs show -g "$AZ_RG" -n "$svc" --tail 30 2>/dev/null | \
      grep -E "invalid userinfo|database connect|connect database|listening|ready" || true
  fi
done

echo
echo "Done. Verify with:"
echo "  az containerapp logs show -g $AZ_RG -n upcore-auth --tail 50 | grep -i 'database\|invalid'"

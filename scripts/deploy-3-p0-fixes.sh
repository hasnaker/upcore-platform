#!/usr/bin/env bash
# deploy-3-p0-fixes.sh — Deploy fix commit e87e5b1 to upcore-prod-neu.
#
# Bugs covered:
#  - BUG 1: web BFF Clerk JWT injection (image: upcore/web)
#  - BUG 2: 14 service db-url URL-encoded restart  (no rebuild — KV refresh)
#  - BUG 3: auth StripSlashes /me 301 (image: upcore/auth)
#
# Required env:
#   AZ_RG=upcore-prod-neu
#   ACR_NAME=upcoreprodacr
#   IMAGE_TAG=prod        (Container Apps follow :prod)
#
# Usage:
#   APPLY=1 ./scripts/deploy-3-p0-fixes.sh
set -euo pipefail

: "${AZ_RG:=upcore-prod-neu}"
: "${ACR_NAME:=upcoreprodacr}"
: "${IMAGE_TAG:=prod}"
: "${COMMIT:=$(git rev-parse --short HEAD)}"
: "${APPLY:=0}"

run() {
  if [[ "$APPLY" == "1" ]]; then echo "[apply] $*"; eval "$@"
  else echo "[dry-run] $*"; fi
}

echo "Resource group: $AZ_RG"
echo "ACR           : $ACR_NAME"
echo "Tag           : $IMAGE_TAG ($COMMIT)"
echo "Apply         : $APPLY  (set APPLY=1 to mutate)"
echo

# ----- Build images via ACR remote build -----

echo "== 1) Build & push images =="
run "az acr build --registry $ACR_NAME --image upcore/web:$IMAGE_TAG --image upcore/web:$COMMIT --file apps/web/Dockerfile ."
run "az acr build --registry $ACR_NAME --image upcore/auth:$IMAGE_TAG --image upcore/auth:$COMMIT --file services/auth/Dockerfile services/auth"

# ----- Roll Container Apps -----

echo
echo "== 2) Update Container Apps to new image =="
run "az containerapp update -g $AZ_RG -n upcore-web --image $ACR_NAME.azurecr.io/upcore/web:$COMMIT"
run "az containerapp update -g $AZ_RG -n upcore-auth --image $ACR_NAME.azurecr.io/upcore/auth:$COMMIT"

# ----- Refresh remaining 14 services so they reread KV db-url -----

echo
echo "== 3) Restart non-rebuilt services (KV db-url refresh) =="
SVCS=(
  upcore-tenant upcore-employee upcore-organization upcore-leave
  upcore-document upcore-survey upcore-assessment upcore-notification
  upcore-audit upcore-intervention upcore-mobility upcore-ats
  upcore-billing upcore-bordro upcore-performance upcore-status
  upcore-api-gateway
)
for s in "${SVCS[@]}"; do
  run "az containerapp revision list -g $AZ_RG -n $s --query '[?properties.active].name | [0]' -o tsv | xargs -I{} az containerapp revision restart -g $AZ_RG -n $s --revision {}"
done

# ----- Smoke test -----

echo
echo "== 4) Smoke test =="
APP_HOST="${APP_HOST:-https://app.upcore.io}"
GW_HOST="${GW_HOST:-https://api.upcore.io}"
echo "App host      : $APP_HOST"
echo "Gateway host  : $GW_HOST"

run "curl -s -o /dev/null -w 'GET /api/v1/status %{http_code}\\n' $GW_HOST/api/v1/status/components"
run "curl -s -o /dev/null -w 'GET /health (gateway) %{http_code}\\n' $GW_HOST/health"

echo
echo "Done. Manual checks:"
echo "  1. Open $APP_HOST in browser, sign in via Clerk."
echo "  2. DevTools network: /api/notifications -> 200, /api/v1/auth/me -> 200,"
echo "     /api/v1/tenants/me/modules -> 200."
echo "  3. az containerapp logs show -g $AZ_RG -n upcore-auth --tail 30 (no invalid userinfo)."

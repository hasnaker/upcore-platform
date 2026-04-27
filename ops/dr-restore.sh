#!/usr/bin/env bash
# UpCore DR geo-restore runbook script.
#
# Bu script PRODUCTION ORTAMINI YENİ bir bölgeye geri yükler. Yalnızca P1
# seviyesinde kullanın; yanlış çalıştırma 2x Azure compute maliyeti yaratır.
#
# Usage:
#   CTO_APPROVAL=<ticket-id> ./dr-restore.sh
#
# Env vars (all required):
#   AZ_RG                — resource group (ör. upcore-prod)
#   AZ_SOURCE_SERVER     — primary pg flex server name
#   AZ_DR_SERVER         — new DR server name (ör. upcore-dr-20260421)
#   AZ_DR_LOCATION       — e.g. "northeurope"
#   AZ_DR_ZONE           — "1", "2", "3"
#   CTO_APPROVAL         — ticket / change number (logged)

set -euo pipefail

: "${AZ_RG:?}"
: "${AZ_SOURCE_SERVER:?}"
: "${AZ_DR_SERVER:?}"
: "${AZ_DR_LOCATION:?}"
: "${AZ_DR_ZONE:=1}"
: "${CTO_APPROVAL:?missing CTO_APPROVAL ticket id}"

log() {
  echo "[$(date --iso-8601=seconds)] $*" | tee -a /tmp/dr-restore.log
}

log "=== DR restore start ==="
log "approval=$CTO_APPROVAL rg=$AZ_RG src=$AZ_SOURCE_SERVER dst=$AZ_DR_SERVER loc=$AZ_DR_LOCATION"

read -r -p "Tüm trafik $AZ_DR_SERVER'a yönlendirilecek. DEVAM için 'FAILOVER' yazın: " ANSWER
if [ "$ANSWER" != "FAILOVER" ]; then
  log "Aborted — confirmation not matched."
  exit 1
fi

log "1/5 Creating geo-restore server..."
az postgres flexible-server geo-restore \
  --resource-group "$AZ_RG" \
  --name "$AZ_DR_SERVER" \
  --source-server "$AZ_SOURCE_SERVER" \
  --location "$AZ_DR_LOCATION" \
  --availability-zone "$AZ_DR_ZONE" \
  --tags "dr=true" "approval=$CTO_APPROVAL" \
  --output json | tee -a /tmp/dr-restore.log

log "2/5 Enabling production firewall rule for DR server..."
az postgres flexible-server firewall-rule create \
  --resource-group "$AZ_RG" \
  --name "$AZ_DR_SERVER" \
  --rule-name "azure-internal" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0" \
  --output none

log "3/5 DR host sanity check..."
az postgres flexible-server show \
  --resource-group "$AZ_RG" \
  --name "$AZ_DR_SERVER" \
  --query '{state: state, version: version, fqdn: fullyQualifiedDomainName}' \
  --output table

log "4/5 Waiting for server to be Ready (max 30 min)..."
for i in {1..60}; do
  STATE=$(az postgres flexible-server show \
    --resource-group "$AZ_RG" --name "$AZ_DR_SERVER" \
    --query 'state' -o tsv)
  if [ "$STATE" = "Ready" ]; then
    log "Server Ready after $((i*30))s."
    break
  fi
  sleep 30
done

log "5/5 Manual steps required (DO BY HAND, cannot be safely scripted):"
echo "  [ ] Update gateway/BFF DATABASE_URL env var to new FQDN"
echo "  [ ] Trigger fresh deploy of all Go services + apps/web"
echo "  [ ] Verify smoke test (login → bordro slip → report download)"
echo "  [ ] Post public status page update"
echo "  [ ] Send customer comms (30 min SLA)"
echo ""
echo "Old primary ($AZ_SOURCE_SERVER) is READ-ONLY accidentally-safe. Do NOT delete for 48h."

log "=== DR restore complete — manual steps pending ==="

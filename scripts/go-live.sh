#!/bin/bash
# UpCore Production Go-Live — Tek Script
# Kullanım: ./scripts/go-live.sh
# Süre: ~45-60 dakika (manuel onay gerektirir)

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

ok()    { echo -e "${GREEN}✓${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
ask()   { read -rp "$(echo -e ${YELLOW}?${NC} $1 ): " "$2"; }
pause() { read -rp "$(echo -e ${YELLOW}↵${NC} Devam etmek için Enter, iptal için Ctrl-C): "; }

cd "$(dirname "$0")/.."

# ============================================================================
# AŞAMA 0 — ÖN KOŞUL KONTROL
# ============================================================================
echo
echo "=========================================="
echo "UpCore Go-Live · Aşama 0 · Ön koşul"
echo "=========================================="

command -v az >/dev/null 2>&1 || fail "az CLI yok. Yükle: brew install azure-cli"
command -v gh >/dev/null 2>&1 || fail "gh CLI yok. Yükle: brew install gh"
command -v jq >/dev/null 2>&1 || fail "jq yok. Yükle: brew install jq"
ok "CLI'ler hazır"

if ! az account show >/dev/null 2>&1; then
  warn "Azure'a giriş yapılmamış"
  az login
fi
SUB_ID=$(az account show --query id -o tsv)
SUB_NAME=$(az account show --query name -o tsv)
ok "Azure: $SUB_NAME ($SUB_ID)"

if ! gh auth status >/dev/null 2>&1; then
  warn "GitHub'a giriş yapılmamış"
  gh auth login
fi
ok "GitHub auth hazır"

ask "Devam edilsin mi? (yes/no)" CONFIRM
[[ "$CONFIRM" == "yes" ]] || fail "İptal"

# ============================================================================
# AŞAMA 1 — ENV BİLGİLERİ
# ============================================================================
echo
echo "=========================================="
echo "Aşama 1 · Env bilgileri"
echo "=========================================="

ask "Resource group adı [upc-prod-rg]" RG
RG=${RG:-upc-prod-rg}
ask "Bölge [westeurope]" REGION
REGION=${REGION:-westeurope}
ask "Domain [upcore.io]" DOMAIN
DOMAIN=${DOMAIN:-upcore.io}

echo
warn "Aşağıdaki Clerk live key'leri Clerk Dashboard'dan al:"
warn "  https://dashboard.clerk.com → Production instance → API Keys"
ask "Clerk pk_live_..." CLERK_PK
ask "Clerk sk_live_..." CLERK_SK
[[ "$CLERK_PK" == pk_live_* ]] || fail "Clerk publishable key 'pk_live_' ile başlamalı"
[[ "$CLERK_SK" == sk_live_* ]] || fail "Clerk secret key 'sk_live_' ile başlamalı"

POSTGRES_PWD=$(openssl rand -base64 24 | tr -d '=' | head -c 24)
ok "PostgreSQL admin password generated"

# ============================================================================
# AŞAMA 2 — RESOURCE GROUP + BICEP DEPLOY
# ============================================================================
echo
echo "=========================================="
echo "Aşama 2 · Bicep deploy (~15 dk)"
echo "=========================================="

az group create --name "$RG" --location "$REGION" --output none
ok "Resource group: $RG"

cd infrastructure/azure
warn "Bicep deploy başlıyor — Container Apps Env, PostgreSQL Flexible (HA), Key Vault, ACR, Front Door"
pause

az deployment group create \
  --resource-group "$RG" \
  --template-file main.bicep \
  --parameters params/prod.bicepparam \
  --parameters postgresAdminPassword="$POSTGRES_PWD" \
  --output table

ACR=$(az deployment group show -g "$RG" -n main --query 'properties.outputs.acrLoginServer.value' -o tsv)
KV=$(az deployment group show -g "$RG" -n main --query 'properties.outputs.keyVaultName.value' -o tsv)
FD=$(az deployment group show -g "$RG" -n main --query 'properties.outputs.frontDoorEndpoint.value' -o tsv)
PG=$(az deployment group show -g "$RG" -n main --query 'properties.outputs.postgresFqdn.value' -o tsv)
ok "ACR: $ACR · Key Vault: $KV · Front Door: $FD"
cd ../..

# ============================================================================
# AŞAMA 3 — KEY VAULT SECRETS
# ============================================================================
echo
echo "=========================================="
echo "Aşama 3 · Key Vault secrets"
echo "=========================================="

az keyvault secret set --vault-name "$KV" --name clerk-publishable-key --value "$CLERK_PK" --output none
az keyvault secret set --vault-name "$KV" --name clerk-secret-key --value "$CLERK_SK" --output none
az keyvault secret set --vault-name "$KV" --name postgres-admin-password --value "$POSTGRES_PWD" --output none
ok "Clerk + Postgres secrets Key Vault'ta"

warn "Stripe/Iyzico/SendGrid/Sentry secret'ları manuel ekle:"
echo "  az keyvault secret set --vault-name $KV --name stripe-secret-key --value sk_live_..."
echo "  az keyvault secret set --vault-name $KV --name iyzico-api-key --value ..."
echo "  az keyvault secret set --vault-name $KV --name sendgrid-api-key --value ..."
echo "  az keyvault secret set --vault-name $KV --name sentry-dsn --value https://..."

# ============================================================================
# AŞAMA 4 — IMAGE BUILD + PUSH
# ============================================================================
echo
echo "=========================================="
echo "Aşama 4 · Image build + push (~25 dk)"
echo "=========================================="

az acr login --name "${ACR%%.*}"
ok "ACR login"

warn "20 servis + 5 ML + 4 frontend image build edilecek. Süre: ~25 dakika."
pause

TAG="v$(date +%Y%m%d-%H%M)"
gh workflow run production.yml \
  -f image_tag="$TAG" \
  -f services=all \
  --ref main
ok "GitHub Actions tetiklendi: production.yml (tag: $TAG)"

echo "  Takip: gh run watch"

# ============================================================================
# AŞAMA 5 — DB MIGRATION
# ============================================================================
echo
echo "=========================================="
echo "Aşama 5 · DB migration"
echo "=========================================="

warn "Migration 001-067 prod DB'ye uygulanacak. Geri alınamaz!"
pause

gh workflow run db-migrate.yml \
  -f environment=prod \
  -f action=up \
  -f service=all \
  --ref main
ok "Migration workflow tetiklendi"

# ============================================================================
# AŞAMA 6 — DNS YÖNERGESİ
# ============================================================================
echo
echo "=========================================="
echo "Aşama 6 · DNS yönergesi (manuel)"
echo "=========================================="
echo
echo "Cloudflare/${DOMAIN} dashboard'da CNAME ekle:"
echo
echo "  app.${DOMAIN}     CNAME  ${FD}"
echo "  api.${DOMAIN}     CNAME  ${FD}"
echo "  admin.${DOMAIN}   CNAME  ${FD}"
echo "  www.${DOMAIN}     CNAME  ${FD}"
echo "  ${DOMAIN}         A      <Front Door IP>  (proxied: ON)"
echo
echo "  status.${DOMAIN}  CNAME  upc-status-swa.azurestaticapps.net"
echo "  docs.${DOMAIN}    CNAME  ${FD}"
echo
warn "DNS propagation 5-30 dk. https://app.${DOMAIN} açılana kadar bekle."

# ============================================================================
# AŞAMA 7 — KABUL TESTİ
# ============================================================================
echo
echo "=========================================="
echo "Aşama 7 · Kabul testi"
echo "=========================================="
echo
echo "DNS aktifleştikten sonra:"
echo "  curl -I https://app.${DOMAIN}            # 200 bekleniyor"
echo "  curl https://api.${DOMAIN}/healthz       # {\"status\":\"ok\"}"
echo "  curl https://status.${DOMAIN}            # Status page"
echo

# ============================================================================
# AŞAMA 8 — DEMO TENANT SEED (opsiyonel)
# ============================================================================
echo "=========================================="
echo "Aşama 8 · Demo tenant seed (opsiyonel)"
echo "=========================================="
echo
echo "Satış demoları için demo-co tenant'ı (120 çalışan, 6 hafta pulse):"
echo "  DEMO_SEED_ALLOW=1 DATABASE_URL=postgres://... ./scripts/seed-demo.sh"
echo
warn "Production DB'ye demo seed sadece pre-launch dönemde önerilir."

# ============================================================================
# ÖZET
# ============================================================================
echo
echo "=========================================="
ok "Go-live başlatıldı"
echo "=========================================="
echo
echo "URL'ler (DNS sonrası):"
echo "  https://app.${DOMAIN}     — Çalışan/İK paneli"
echo "  https://admin.${DOMAIN}   — Platform operatör paneli"
echo "  https://status.${DOMAIN}  — Public status"
echo "  https://docs.${DOMAIN}    — Dokümantasyon"
echo "  https://api.${DOMAIN}     — API gateway"
echo
echo "Sonraki adımlar:"
echo "  1. gh run watch · production.yml takip"
echo "  2. DNS aktifleşince curl smoke test"
echo "  3. Clerk dashboard: production instance + 3 test user (admin/ik/calisan@${DOMAIN})"
echo "  4. Sentry org/project oluştur → DSN'leri Key Vault'a"
echo "  5. Stripe/Iyzico merchant onayı + live key'leri Key Vault"
echo "  6. İlk müşteri için soft launch playbook: docs/customer-success/onboarding.md"
echo
warn "Aylık tahmini Azure burn (boş tenant): ~\$300-500"
warn "Müşteri yokken iptal seçeneği: az group delete --name $RG --yes"

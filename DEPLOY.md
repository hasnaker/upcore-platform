# UpCore — Production Deploy Rehberi (Bicep + ACA)

**Hedef:** UpCore'u Azure westeurope'a canlıya almak — Bicep IaC + Azure Container Apps.
**Süre:** İlk kurulum ~2-3 saat. Sonraki deploy'lar CI otomatik ~10 dk.

> **Stack kararı:** Tek IaC (Bicep), tek compute (ACA), tek pipeline (`production.yml`).
> Ayrıntı: [`docs/deploy/REGION_DECISION.md`](docs/deploy/REGION_DECISION.md)
>
> **Arşivlendi (2026-04-24):** `infrastructure/terraform.ARCHIVED/`, `deploy/helm.ARCHIVED/`

---

## 0. Önkoşullar

- [ ] Azure subscription (prod sub)
- [ ] Global admin Azure AD kullanıcısı + `upc-prod-rg` resource group
- [ ] `upcore.io` domain sahipliği + DNS erişimi (Cloudflare)
- [ ] Clerk prod hesabı (pk_live_… + sk_live_…)
- [ ] Iyzico merchant hesabı + prod API key (TR kart ödemeleri)
- [ ] GitHub repo admin yetkisi (OIDC federated identity secret'ları)

```bash
brew install azure-cli jq k6
az login
az account set --subscription <prod-sub-id>
```

---

## 1. Bicep apply (bir kez)

```bash
cd infrastructure/azure

az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters params/prod.bicepparam
```

Çıktılar:
- `postgresFqdn` → DB host (`upc-prod-pg-flex.postgres.database.azure.com`)
- `acrLoginServer` → image registry URL (`upcprodacr.azurecr.io`)
- `keyVaultUri` → secret storage
- `frontDoorEndpoint` → `app.upcore.io` girişi

---

## 2. Secrets (Key Vault + ACA secretRef)

```bash
# Clerk
az keyvault secret set --vault-name upc-prod-kv --name clerk-secret-key --value "sk_live_..."
az keyvault secret set --vault-name upc-prod-kv --name clerk-publishable-key --value "pk_live_..."

# DB
az keyvault secret set --vault-name upc-prod-kv --name postgres-admin-password --value "..."

# Iyzico
az keyvault secret set --vault-name upc-prod-kv --name iyzico-api-key --value "..."
az keyvault secret set --vault-name upc-prod-kv --name iyzico-secret --value "..."
```

ACA revision'ları Key Vault'tan secretRef ile okur — bkz `infrastructure/azure/modules/container-app.bicep`.

---

## 3. DNS

Cloudflare'de CNAME kayıtları Front Door'a:

| Host | Target |
|---|---|
| `app.upcore.io` | `upc-prod-frontdoor.z01.azurefd.net` |
| `api.upcore.io` | `upc-prod-frontdoor.z01.azurefd.net` |
| `admin.upcore.io` | `upc-prod-frontdoor.z01.azurefd.net` |
| `status.upcore.io` | `upc-status-swa.azurestaticapps.net` (farklı stack — bkz `infrastructure/azure/modules/status-app.bicep`) |

---

## 4. GitHub secrets (`production.yml` için)

| Secret | Açıklama |
|---|---|
| `AZURE_CREDENTIALS_PROD` | OIDC federated identity JSON (SP for `upc-prod-rg`) |
| `AZURE_CLIENT_ID` | SP client id |
| `AZURE_TENANT_ID` | AD tenant id |
| `AZURE_SUBSCRIPTION_ID` | Prod subscription id |
| `POSTGRES_ADMIN_PASSWORD` | Key Vault'tan al |
| `SLACK_INCIDENT_WEBHOOK` | Deploy fail bildirimi |

Ekleme: repo → Settings → Secrets and variables → Actions.

---

## 5. İlk deploy

```bash
# 1. Staging build (staging.yml → otomatik main push'ta)
git push origin main

# 2. DB migration (manuel workflow_dispatch)
gh workflow run db-migrate.yml -f environment=prod -f action=up -f service=all

# 3. Production deploy (manuel, approval gate'li)
gh workflow run production.yml -f image_tag=staging -f services=all
```

Monitor: https://github.com/<org>/upcore-platform/actions

---

## 6. Kabul testi

```bash
curl -I https://app.upcore.io            # HTTP/2 200
curl https://api.upcore.io/healthz       # {"status":"ok"}
curl https://status.upcore.io            # Status page ayrı stack'te (ACA değil)
```

E2E smoke:
```bash
cd apps/web && pnpm exec playwright test --project=chromium --grep smoke
```

---

## 7. Rollback

`production.yml` otomatik rollback artifact'ı yüklüyor. Manuel:

```bash
# Önceki revision'a swap
az containerapp revision list --name upc-prod-api-gateway -g upc-prod-rg
az containerapp revision activate --name upc-prod-api-gateway -g upc-prod-rg --revision <previous>
```

DB migration rollback **manuel** (production'da `down-one` disabled):
```bash
# Ayrı PR ile down.sql hazırla, manuel review + psql apply
psql "$DATABASE_URL" -f services/<svc>/migrations/XXX_name.down.sql
```

---

## 8. Sorun giderme

| Durum | Çözüm |
|---|---|
| Bicep apply "quota exceeded" | Azure quota request: Support → New request |
| Clerk webhook 401 | `upc-prod-kv/clerk-secret-key` doğru mu? |
| Front Door 502 | `az containerapp show --name upc-prod-api-gateway -g upc-prod-rg --query properties.runningStatus` |
| PG connection refused | Private endpoint + private DNS zone doğru bind? |
| ACA "revision not ready" | `az containerapp logs show --name upc-prod-<svc> -g upc-prod-rg --tail 200` |

Sıkıştığında: `docs/runbook/` (servis-başı), `docs/deploy/REGION_DECISION.md`, `ops/BACKUP_RESTORE.md`.

Go live! 🚀

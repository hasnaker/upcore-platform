# UPCORE V1 · Deploy Checklist

## Pre-Deploy (Bu Hafta)

### 1. Microsoft for Startups Başvurusu
- [ ] https://startups.microsoft.com adresinden başvur
- [ ] Şirket bilgileri: Upcore Teknoloji (veya mevcut şirket)
- [ ] Ürün açıklaması: "Bilim-temelli İK platformu, BAT-TR + JD-R"
- [ ] Beklenen: $25K Azure + $2.5K OpenAI + GitHub Enterprise
- [ ] Onay süresi: 1-3 gün

### 2. Azure Subscription Hazırlığı
- [ ] Azure hesabı oluştur (startups onayı gelince)
- [ ] Resource Group: `upcore-dev` oluştur
- [ ] Region: West Europe (Amsterdam) seç
- [ ] CLI login: `az login`

### 3. Domain Ayarı
- [ ] upcore.io Route53 A record → Azure Front Door IP
- [ ] SSL cert: Azure managed certificate
- [ ] app.upcore.io → Container Apps

### 4. Secrets (Azure Key Vault)
- [ ] DATABASE_URL (Azure PostgreSQL connection string)
- [ ] REDIS_URL (Azure Cache for Redis)
- [ ] CLERK_SECRET_KEY (production key)
- [ ] AZURE_OPENAI_API_KEY
- [ ] SENDGRID_API_KEY (email)

## Deploy Steps

### Step 1: Infrastructure (Bicep)
```bash
cd infrastructure/azure
az deployment group create \
  --resource-group upcore-dev \
  --template-file main.bicep \
  --parameters params/dev.bicepparam
```

### Step 2: Database Migration
```bash
# Azure PostgreSQL connection
az postgres flexible-server execute \
  --name upc-dev-pg-flex \
  --admin-user upcore_admin \
  --database-name upcore \
  --file-path ../database/migrations/001_init_extensions.up.sql
# ... repeat for all 20 migrations
```

### Step 3: Docker Build + Push
```bash
# Build all services
for svc in auth tenant employee organization leave document survey intervention audit ats assessment api-gateway; do
  docker build -t ghcr.io/hasnaker/upcore-$svc:v1.0.0 services/$svc/
  docker push ghcr.io/hasnaker/upcore-$svc:v1.0.0
done

# Build Next.js
docker build -t ghcr.io/hasnaker/upcore-web:v1.0.0 apps/web/
docker push ghcr.io/hasnaker/upcore-web:v1.0.0
```

### Step 4: Deploy to Container Apps
```bash
for svc in auth tenant employee organization leave document survey intervention audit ats assessment api-gateway web; do
  az containerapp update \
    --name upc-dev-$svc-ca \
    --resource-group upcore-dev \
    --image ghcr.io/hasnaker/upcore-$svc:v1.0.0
done
```

### Step 5: Smoke Test
```bash
curl https://app.upcore.io/health
curl https://app.upcore.io/api/v1/employees
```

## Post-Deploy

### Monitoring
- [ ] Azure Application Insights dashboard oluştur
- [ ] Sentry project oluştur (frontend + backend)
- [ ] Alert: API p95 > 500ms
- [ ] Alert: Error rate > 1%

### Design Partner Onboarding
- [ ] 5 firma belirle (Asena'nın ağı + Hasan'ın ağı)
- [ ] Her firma için tenant oluştur
- [ ] CSV import ile çalışan verisi yükle
- [ ] İlk pulse survey gönder
- [ ] 2 hafta sonra feedback toplantısı

### TÜBİTAK BiGG
- [ ] 1. Aşama başvuru hazırla (200K TL)
- [ ] Akademik çerçeve: BAT-TR + JD-R + Job Crafting (dokümanlar hazır)
- [ ] Ekip: Hasan (yazılım) + Asena (akademik) + I-O danışman
- [ ] Timeline: V1 → pilot → BiGG başvuru

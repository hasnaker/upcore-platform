using '../main.bicep'

// ============================================================================
// Upcore V1 — Production Environment Parameters
// ============================================================================

param environment = 'prod'
param location = 'westeurope'
param tenantId = readEnvironmentVariable('AZURE_TENANT_ID', '')
param adminPrincipalIds = []
param customDomain = 'app.upcore.io'

// PostgreSQL — full production config
param postgresSkuName = 'Standard_D4ds_v5'
param postgresSkuTier = 'GeneralPurpose'
param postgresStorageSizeGB = 128
param postgresHaMode = 'ZoneRedundant'
param postgresGeoBackup = true
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD', '')

// Redis — Standard C1
param redisSkuName = 'Standard'
param redisCapacity = 1

// Service Bus — Premium with zone redundancy
param serviceBusSkuName = 'Premium'
param serviceBusMessagingUnits = 1

// Storage — ZRS for zone redundancy
param storageSkuName = 'Standard_ZRS'

// OpenAI — full capacity
param gpt4oCapacity = 30
param embeddingCapacity = 120

// Logging — long retention
param logRetentionDays = 90

// WAF — prevention mode
param wafMode = 'Prevention'

// Container Apps — production sizing
param defaultCpu = '0.5'
param defaultMemory = '1Gi'
param defaultMinReplicas = 2
param defaultMaxReplicas = 10

// Registry
param registryServer = 'ghcr.io'
param registryUsername = readEnvironmentVariable('GHCR_USERNAME', '')
param registryPassword = readEnvironmentVariable('GHCR_TOKEN', '')

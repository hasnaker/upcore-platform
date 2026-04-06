using '../main.bicep'

// ============================================================================
// Upcore V1 — Staging Environment Parameters
// ============================================================================

param environment = 'staging'
param location = 'westeurope'
param tenantId = readEnvironmentVariable('AZURE_TENANT_ID', '')
param adminPrincipalIds = []

// PostgreSQL — moderate config, mirrors prod schema
param postgresSkuName = 'Standard_D2ds_v5'
param postgresSkuTier = 'GeneralPurpose'
param postgresStorageSizeGB = 64
param postgresHaMode = 'Disabled'
param postgresGeoBackup = false
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD', '')

// Redis — Standard C1
param redisSkuName = 'Standard'
param redisCapacity = 1

// Service Bus — Premium (test Premium features before prod)
param serviceBusSkuName = 'Premium'
param serviceBusMessagingUnits = 1

// Storage — ZRS
param storageSkuName = 'Standard_ZRS'

// OpenAI — moderate capacity
param gpt4oCapacity = 20
param embeddingCapacity = 60

// Logging
param logRetentionDays = 60

// WAF — prevention mode in staging (test WAF rules)
param wafMode = 'Prevention'

// Container Apps — 1 replica baseline
param defaultCpu = '0.5'
param defaultMemory = '1Gi'
param defaultMinReplicas = 1
param defaultMaxReplicas = 2

// Registry
param registryServer = 'ghcr.io'
param registryUsername = readEnvironmentVariable('GHCR_USERNAME', '')
param registryPassword = readEnvironmentVariable('GHCR_TOKEN', '')

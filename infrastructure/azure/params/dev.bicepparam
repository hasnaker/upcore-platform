using '../main.bicep'

// ============================================================================
// Upcore V1 — Development Environment Parameters
// ============================================================================

param environment = 'dev'
param location = 'westeurope'
param tenantId = readEnvironmentVariable('AZURE_TENANT_ID', '')
param adminPrincipalIds = []

// PostgreSQL — smallest viable config
param postgresSkuName = 'Standard_B2s'
param postgresSkuTier = 'Burstable'
param postgresStorageSizeGB = 32
param postgresHaMode = 'Disabled'
param postgresGeoBackup = false
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD', '')

// Redis — Basic C0 for dev
param redisSkuName = 'Basic'
param redisCapacity = 0

// Service Bus — Standard (no Premium needed in dev)
param serviceBusSkuName = 'Standard'
param serviceBusMessagingUnits = 0

// Storage — LRS for dev (no redundancy)
param storageSkuName = 'Standard_LRS'

// OpenAI — minimal capacity
param gpt4oCapacity = 10
param embeddingCapacity = 30

// Logging
param logRetentionDays = 30

// WAF — detection mode in dev
param wafMode = 'Detection'

// Container Apps — minimal resources
param defaultCpu = '0.25'
param defaultMemory = '0.5Gi'
param defaultMinReplicas = 0
param defaultMaxReplicas = 1

// Registry
param registryServer = 'ghcr.io'
param registryUsername = readEnvironmentVariable('GHCR_USERNAME', '')
param registryPassword = readEnvironmentVariable('GHCR_TOKEN', '')

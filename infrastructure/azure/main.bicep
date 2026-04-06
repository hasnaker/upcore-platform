// ============================================================================
// Upcore V1 — Root Infrastructure Orchestrator
// ============================================================================
// Deploys all Azure resources for the Upcore platform.
//
// Usage:
//   az deployment group create \
//     --resource-group upc-{env}-rg \
//     --template-file main.bicep \
//     --parameters params/{env}.bicepparam
// ============================================================================

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// Global Parameters
// ---------------------------------------------------------------------------
@description('Environment name')
@allowed(['dev', 'staging', 'prod'])
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Azure AD tenant ID')
param tenantId string

@description('Admin principal IDs for Key Vault access')
param adminPrincipalIds array = []

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('Container registry server')
param registryServer string = 'ghcr.io'

@description('Container registry username')
param registryUsername string = ''

@description('Container registry password')
@secure()
param registryPassword string = ''

@description('Custom domain')
param customDomain string = ''

// ---------------------------------------------------------------------------
// Environment-specific configuration
// ---------------------------------------------------------------------------
@description('PostgreSQL SKU name')
param postgresSkuName string = 'Standard_D4ds_v5'

@description('PostgreSQL SKU tier')
param postgresSkuTier string = 'GeneralPurpose'

@description('PostgreSQL storage size in GB')
param postgresStorageSizeGB int = 128

@description('PostgreSQL HA mode')
param postgresHaMode string = 'Disabled'

@description('PostgreSQL geo-redundant backup')
param postgresGeoBackup bool = false

@description('Redis SKU')
param redisSkuName string = 'Standard'

@description('Redis capacity')
param redisCapacity int = 1

@description('Service Bus SKU')
param serviceBusSkuName string = 'Premium'

@description('Service Bus messaging units')
param serviceBusMessagingUnits int = 1

@description('Storage SKU')
param storageSkuName string = 'Standard_ZRS'

@description('GPT-4o capacity (TPM in thousands)')
param gpt4oCapacity int = 30

@description('Embedding model capacity')
param embeddingCapacity int = 120

@description('Log retention in days')
param logRetentionDays int = 90

@description('WAF mode')
param wafMode string = 'Prevention'

@description('Container App default CPU')
param defaultCpu string = '0.5'

@description('Container App default memory')
param defaultMemory string = '1Gi'

@description('Container App default min replicas')
param defaultMinReplicas int = 1

@description('Container App default max replicas')
param defaultMaxReplicas int = 3

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
var tags = {
  project: 'upcore'
  environment: environment
  managedBy: 'bicep'
  version: 'v1'
}

// ============================================================================
// Module Deployments
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Virtual Network
// ---------------------------------------------------------------------------
module vnet 'modules/vnet.bicep' = {
  name: 'vnet-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
  }
}

// ---------------------------------------------------------------------------
// 2. Application Insights + Log Analytics
// ---------------------------------------------------------------------------
module appInsights 'modules/app-insights.bicep' = {
  name: 'app-insights-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    retentionDays: logRetentionDays
  }
}

// ---------------------------------------------------------------------------
// 3. Key Vault
// ---------------------------------------------------------------------------
module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    tenantId: tenantId
    adminPrincipalIds: adminPrincipalIds
    privateEndpointSubnetId: vnet.outputs.privateEndpointsSubnetId
    privateDnsZoneId: vnet.outputs.keyVaultDnsZoneId
  }
}

// ---------------------------------------------------------------------------
// 4. PostgreSQL
// ---------------------------------------------------------------------------
module postgres 'modules/postgres.bicep' = {
  name: 'postgres-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    administratorPassword: postgresAdminPassword
    skuName: postgresSkuName
    skuTier: postgresSkuTier
    storageSizeGB: postgresStorageSizeGB
    highAvailabilityMode: postgresHaMode
    geoRedundantBackup: postgresGeoBackup
    delegatedSubnetId: vnet.outputs.postgresSubnetId
    privateDnsZoneId: vnet.outputs.postgresDnsZoneId
  }
}

// ---------------------------------------------------------------------------
// 5. Redis
// ---------------------------------------------------------------------------
module redis 'modules/redis.bicep' = {
  name: 'redis-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    skuName: redisSkuName
    skuCapacity: redisCapacity
    privateEndpointSubnetId: vnet.outputs.privateEndpointsSubnetId
    privateDnsZoneId: vnet.outputs.redisDnsZoneId
  }
}

// ---------------------------------------------------------------------------
// 6. Service Bus
// ---------------------------------------------------------------------------
module serviceBus 'modules/service-bus.bicep' = {
  name: 'service-bus-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    skuName: serviceBusSkuName
    messagingUnits: serviceBusMessagingUnits
    privateEndpointSubnetId: vnet.outputs.privateEndpointsSubnetId
    privateDnsZoneId: vnet.outputs.serviceBusDnsZoneId
  }
}

// ---------------------------------------------------------------------------
// 7. Storage
// ---------------------------------------------------------------------------
module storage 'modules/storage.bicep' = {
  name: 'storage-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    skuName: storageSkuName
    privateEndpointSubnetId: vnet.outputs.privateEndpointsSubnetId
    privateDnsZoneId: vnet.outputs.blobDnsZoneId
  }
}

// ---------------------------------------------------------------------------
// 8. Azure OpenAI
// ---------------------------------------------------------------------------
module openai 'modules/openai.bicep' = {
  name: 'openai-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    gpt4oCapacity: gpt4oCapacity
    embeddingCapacity: embeddingCapacity
    privateEndpointSubnetId: vnet.outputs.privateEndpointsSubnetId
    privateDnsZoneId: vnet.outputs.openAiDnsZoneId
  }
}

// ---------------------------------------------------------------------------
// 9. Container Apps Environment
// ---------------------------------------------------------------------------
module containerAppsEnv 'modules/container-apps-env.bicep' = {
  name: 'container-apps-env-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
    logAnalyticsCustomerId: appInsights.outputs.logAnalyticsCustomerId
    logAnalyticsSharedKey: listKeys(appInsights.outputs.logAnalyticsWorkspaceId, '2023-09-01').primarySharedKey
    infrastructureSubnetId: vnet.outputs.containerAppsSubnetId
    appInsightsConnectionString: appInsights.outputs.appInsightsConnectionString
  }
}

// ---------------------------------------------------------------------------
// 10. Front Door + WAF
// ---------------------------------------------------------------------------
module frontDoor 'modules/front-door.bicep' = {
  name: 'front-door-${environment}'
  params: {
    environment: environment
    tags: tags
    containerAppsDefaultDomain: containerAppsEnv.outputs.defaultDomain
    containerAppsStaticIp: containerAppsEnv.outputs.staticIp
    customDomain: customDomain
    wafMode: wafMode
  }
}

// ---------------------------------------------------------------------------
// 11. Container Apps — All 20 Services
// ---------------------------------------------------------------------------

// Shared environment variables for all services
var sharedEnvVars = [
  { name: 'ENVIRONMENT', value: environment }
  { name: 'DATABASE_HOST', value: postgres.outputs.serverFqdn }
  { name: 'DATABASE_NAME', value: postgres.outputs.databaseName }
  { name: 'DATABASE_USER', value: 'upcoreadmin' }
  { name: 'DATABASE_SSL_MODE', value: 'require' }
  { name: 'REDIS_HOST', value: redis.outputs.redisHostName }
  { name: 'REDIS_PORT', value: string(redis.outputs.redisSslPort) }
  { name: 'REDIS_TLS', value: 'true' }
  { name: 'SERVICE_BUS_NAMESPACE', value: serviceBus.outputs.namespaceFqdn }
  { name: 'STORAGE_ACCOUNT_NAME', value: storage.outputs.storageAccountName }
  { name: 'STORAGE_BLOB_ENDPOINT', value: storage.outputs.primaryBlobEndpoint }
  { name: 'OPENAI_ENDPOINT', value: openai.outputs.openaiEndpoint }
  { name: 'OPENAI_DEPLOYMENT_NAME', value: openai.outputs.gpt4oDeploymentName }
  { name: 'OPENAI_EMBEDDING_DEPLOYMENT', value: openai.outputs.embeddingDeploymentName }
  { name: 'KEY_VAULT_URI', value: keyVault.outputs.keyVaultUri }
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.outputs.appInsightsConnectionString }
  { name: 'LOG_LEVEL', value: environment == 'prod' ? 'info' : 'debug' }
  { name: 'TZ', value: 'Europe/Istanbul' }
]

var sharedSecrets = [
  { name: 'db-password', envVarName: 'DATABASE_PASSWORD', value: postgresAdminPassword }
  { name: 'redis-password', envVarName: 'REDIS_PASSWORD', value: redis.outputs.redisPrimaryKey }
]

// ----- Go Services (14) -----

// Service definitions: name, port, cpu, memory, minReplicas, maxReplicas
var goServices = [
  { name: 'api-gateway', port: 8080, cpu: '1', mem: '2Gi', min: 2, max: 10, external: true }
  { name: 'auth', port: 8001, cpu: '0.5', mem: '1Gi', min: 2, max: 5, external: false }
  { name: 'tenant', port: 8002, cpu: '0.5', mem: '1Gi', min: 1, max: 3, external: false }
  { name: 'organization', port: 8003, cpu: '0.5', mem: '1Gi', min: 1, max: 3, external: false }
  { name: 'employee', port: 8004, cpu: '0.5', mem: '1Gi', min: 2, max: 5, external: false }
  { name: 'leave', port: 8005, cpu: '0.5', mem: '1Gi', min: 1, max: 5, external: false }
  { name: 'survey', port: 8006, cpu: '0.5', mem: '1Gi', min: 1, max: 5, external: false }
  { name: 'assessment', port: 8007, cpu: '0.5', mem: '1Gi', min: 1, max: 3, external: false }
  { name: 'document', port: 8008, cpu: '0.5', mem: '1Gi', min: 1, max: 3, external: false }
  { name: 'notification', port: 8009, cpu: '0.5', mem: '1Gi', min: 1, max: 5, external: false }
  { name: 'audit', port: 8010, cpu: '0.25', mem: '0.5Gi', min: 1, max: 3, external: false }
  { name: 'intervention', port: 8011, cpu: '0.5', mem: '1Gi', min: 1, max: 3, external: false }
  { name: 'mobility', port: 8012, cpu: '0.5', mem: '1Gi', min: 1, max: 3, external: false }
  { name: 'ats', port: 8013, cpu: '0.5', mem: '1Gi', min: 1, max: 3, external: false }
]

module goContainerApps 'modules/container-app.bicep' = [
  for service in goServices: {
    name: 'ca-${service.name}-${environment}'
    params: {
      environment: environment
      location: location
      tags: tags
      containerAppsEnvId: containerAppsEnv.outputs.environmentId
      serviceName: service.name
      containerImage: '${registryServer}/upcore/${service.name}:${environment}'
      targetPort: service.port
      cpu: service.cpu
      memory: service.mem
      minReplicas: environment == 'prod' ? service.min : (environment == 'staging' ? 1 : 0)
      maxReplicas: environment == 'prod' ? service.max : (environment == 'staging' ? 2 : 1)
      externalIngress: service.external
      envVars: concat(sharedEnvVars, [
        { name: 'SERVICE_NAME', value: service.name }
        { name: 'SERVICE_PORT', value: string(service.port) }
      ])
      secrets: sharedSecrets
      registryServer: registryServer
      registryUsername: registryUsername
      registryPassword: registryPassword
      workloadProfileName: service.name == 'api-gateway' && environment == 'prod' ? 'Dedicated-D4' : 'Consumption'
    }
  }
]

// ----- Python ML Services (4) -----

var pythonServices = [
  { name: 'burnout-prediction', port: 8021, cpu: '1', mem: '2Gi', min: 1, max: 3 }
  { name: 'psychometric-scoring', port: 8022, cpu: '1', mem: '2Gi', min: 1, max: 3 }
  { name: 'recommendation', port: 8023, cpu: '0.5', mem: '1Gi', min: 1, max: 3 }
  { name: 'action-center', port: 8024, cpu: '0.5', mem: '1Gi', min: 1, max: 3 }
]

module pythonContainerApps 'modules/container-app.bicep' = [
  for service in pythonServices: {
    name: 'ca-${service.name}-${environment}'
    params: {
      environment: environment
      location: location
      tags: tags
      containerAppsEnvId: containerAppsEnv.outputs.environmentId
      serviceName: service.name
      containerImage: '${registryServer}/upcore/${service.name}:${environment}'
      targetPort: service.port
      cpu: service.cpu
      memory: service.mem
      minReplicas: environment == 'prod' ? service.min : 0
      maxReplicas: environment == 'prod' ? service.max : 1
      externalIngress: false
      envVars: concat(sharedEnvVars, [
        { name: 'SERVICE_NAME', value: service.name }
        { name: 'SERVICE_PORT', value: string(service.port) }
        { name: 'PYTHONUNBUFFERED', value: '1' }
      ])
      secrets: sharedSecrets
      registryServer: registryServer
      registryUsername: registryUsername
      registryPassword: registryPassword
      workloadProfileName: environment == 'prod' ? 'Dedicated-D4' : 'Consumption'
      healthCheckPath: '/health'
      readinessCheckPath: '/health'
      startupCheckPath: '/health'
    }
  }
]

// ----- Next.js Web App -----

module webApp 'modules/container-app.bicep' = {
  name: 'ca-web-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    containerAppsEnvId: containerAppsEnv.outputs.environmentId
    serviceName: 'web'
    containerImage: '${registryServer}/upcore/web:${environment}'
    targetPort: 3000
    cpu: '0.5'
    memory: '1Gi'
    minReplicas: environment == 'prod' ? 2 : 1
    maxReplicas: environment == 'prod' ? 5 : 2
    externalIngress: true
    envVars: [
      { name: 'ENVIRONMENT', value: environment }
      { name: 'NEXT_PUBLIC_API_URL', value: 'https://${frontDoor.outputs.endpointHostName}/api' }
      { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.outputs.appInsightsConnectionString }
      { name: 'NODE_ENV', value: environment == 'prod' ? 'production' : 'development' }
    ]
    secrets: []
    registryServer: registryServer
    registryUsername: registryUsername
    registryPassword: registryPassword
    healthCheckPath: '/api/health'
    readinessCheckPath: '/api/health'
    startupCheckPath: '/api/health'
  }
}

// ----- Admin Panel -----

module adminApp 'modules/container-app.bicep' = {
  name: 'ca-admin-${environment}'
  params: {
    environment: environment
    location: location
    tags: tags
    containerAppsEnvId: containerAppsEnv.outputs.environmentId
    serviceName: 'admin'
    containerImage: '${registryServer}/upcore/admin:${environment}'
    targetPort: 3000
    cpu: '0.25'
    memory: '0.5Gi'
    minReplicas: environment == 'prod' ? 1 : 0
    maxReplicas: environment == 'prod' ? 2 : 1
    externalIngress: false
    envVars: [
      { name: 'ENVIRONMENT', value: environment }
      { name: 'NEXT_PUBLIC_API_URL', value: 'https://${frontDoor.outputs.endpointHostName}/api' }
      { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.outputs.appInsightsConnectionString }
      { name: 'NODE_ENV', value: environment == 'prod' ? 'production' : 'development' }
    ]
    secrets: []
    registryServer: registryServer
    registryUsername: registryUsername
    registryPassword: registryPassword
    healthCheckPath: '/api/health'
    readinessCheckPath: '/api/health'
    startupCheckPath: '/api/health'
  }
}

// ============================================================================
// Outputs
// ============================================================================
output frontDoorEndpoint string = frontDoor.outputs.endpointHostName
output containerAppsEnvironment string = containerAppsEnv.outputs.environmentName
output postgresServer string = postgres.outputs.serverFqdn
output redisHost string = redis.outputs.redisHostName
output serviceBusNamespace string = serviceBus.outputs.namespaceFqdn
output storageAccount string = storage.outputs.storageAccountName
output openaiEndpoint string = openai.outputs.openaiEndpoint
output keyVaultUri string = keyVault.outputs.keyVaultUri
output appInsightsName string = appInsights.outputs.appInsightsName
output vnetName string = vnet.outputs.vnetName

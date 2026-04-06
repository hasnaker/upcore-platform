// ============================================================================
// Upcore V1 — Container Apps Environment
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

@description('Log Analytics workspace ID')
param logAnalyticsWorkspaceId string

@description('Log Analytics customer ID')
param logAnalyticsCustomerId string

@description('Log Analytics shared key')
@secure()
param logAnalyticsSharedKey string

@description('Container Apps subnet ID')
param infrastructureSubnetId string

@description('Application Insights connection string')
param appInsightsConnectionString string

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var envName = 'upc-${environment}-cae'

// ---------------------------------------------------------------------------
// Container Apps Environment
// ---------------------------------------------------------------------------
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: envName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: infrastructureSubnetId
      internal: true
    }
    zoneRedundant: environment == 'prod'
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
      {
        name: 'Dedicated-D4'
        workloadProfileType: 'D4'
        minimumCount: environment == 'prod' ? 2 : 1
        maximumCount: environment == 'prod' ? 10 : 3
      }
    ]
    daprConfiguration: {
      enabled: false
    }
    peerAuthentication: {
      mtls: {
        enabled: true
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Managed Certificate placeholder (Front Door terminates TLS)
// ---------------------------------------------------------------------------
// TLS is terminated at Azure Front Door. Container Apps use internal mTLS.
// Custom domain bindings are configured post-deployment via az CLI.

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output environmentId string = containerAppsEnv.id
output environmentName string = containerAppsEnv.name
output defaultDomain string = containerAppsEnv.properties.defaultDomain
output staticIp string = containerAppsEnv.properties.staticIp

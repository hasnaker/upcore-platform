// ============================================================================
// Upcore V1 — Virtual Network + Subnets + Private Endpoints
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var vnetName = 'upc-${environment}-vnet'
var nsgName = 'upc-${environment}-default-nsg'

var addressPrefix = '10.0.0.0/16'

var subnets = [
  {
    name: 'snet-container-apps'
    addressPrefix: '10.0.0.0/21' // /21 = 2046 hosts — enough for Container Apps
    delegations: [
      {
        name: 'Microsoft.App.environments'
        properties: {
          serviceName: 'Microsoft.App/environments'
        }
      }
    ]
    serviceEndpoints: []
    privateEndpointNetworkPolicies: 'Disabled'
  }
  {
    name: 'snet-postgres'
    addressPrefix: '10.0.8.0/24'
    delegations: [
      {
        name: 'Microsoft.DBforPostgreSQL.flexibleServers'
        properties: {
          serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
        }
      }
    ]
    serviceEndpoints: []
    privateEndpointNetworkPolicies: 'Disabled'
  }
  {
    name: 'snet-redis'
    addressPrefix: '10.0.9.0/24'
    delegations: []
    serviceEndpoints: []
    privateEndpointNetworkPolicies: 'Disabled'
  }
  {
    name: 'snet-private-endpoints'
    addressPrefix: '10.0.10.0/24'
    delegations: []
    serviceEndpoints: [
      { service: 'Microsoft.Storage' }
      { service: 'Microsoft.KeyVault' }
      { service: 'Microsoft.ServiceBus' }
      { service: 'Microsoft.CognitiveServices' }
    ]
    privateEndpointNetworkPolicies: 'Enabled'
  }
  {
    name: 'snet-management'
    addressPrefix: '10.0.11.0/24'
    delegations: []
    serviceEndpoints: []
    privateEndpointNetworkPolicies: 'Disabled'
  }
]

// ---------------------------------------------------------------------------
// Network Security Group
// ---------------------------------------------------------------------------
resource nsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: nsgName
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'DenyAllInbound'
        properties: {
          priority: 4096
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
        }
      }
      {
        name: 'AllowVNetInbound'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: '*'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
          destinationAddressPrefix: 'VirtualNetwork'
          destinationPortRange: '*'
        }
      }
      {
        name: 'AllowAzureLoadBalancerInbound'
        properties: {
          priority: 200
          direction: 'Inbound'
          access: 'Allow'
          protocol: '*'
          sourceAddressPrefix: 'AzureLoadBalancer'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
        }
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Virtual Network
// ---------------------------------------------------------------------------
resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [addressPrefix]
    }
    subnets: [
      for subnet in subnets: {
        name: subnet.name
        properties: {
          addressPrefix: subnet.addressPrefix
          networkSecurityGroup: {
            id: nsg.id
          }
          delegations: subnet.delegations
          serviceEndpoints: subnet.serviceEndpoints
          privateEndpointNetworkPolicies: subnet.privateEndpointNetworkPolicies
        }
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Private DNS Zones
// ---------------------------------------------------------------------------
var privateDnsZones = [
  'privatelink.postgres.database.azure.com'
  'privatelink.redis.cache.windows.net'
  'privatelink.blob.core.windows.net'
  'privatelink.vaultcore.azure.net'
  'privatelink.servicebus.windows.net'
  'privatelink.openai.azure.com'
]

resource dnsZones 'Microsoft.Network/privateDnsZones@2020-06-01' = [
  for zone in privateDnsZones: {
    name: zone
    location: 'global'
    tags: tags
  }
]

resource dnsZoneLinks 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = [
  for (zone, i) in privateDnsZones: {
    parent: dnsZones[i]
    name: '${vnetName}-link'
    location: 'global'
    properties: {
      virtualNetwork: {
        id: vnet.id
      }
      registrationEnabled: false
    }
  }
]

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output vnetId string = vnet.id
output vnetName string = vnet.name
output containerAppsSubnetId string = vnet.properties.subnets[0].id
output postgresSubnetId string = vnet.properties.subnets[1].id
output redisSubnetId string = vnet.properties.subnets[2].id
output privateEndpointsSubnetId string = vnet.properties.subnets[3].id
output managementSubnetId string = vnet.properties.subnets[4].id
output postgresDnsZoneId string = dnsZones[0].id
output redisDnsZoneId string = dnsZones[1].id
output blobDnsZoneId string = dnsZones[2].id
output keyVaultDnsZoneId string = dnsZones[3].id
output serviceBusDnsZoneId string = dnsZones[4].id
output openAiDnsZoneId string = dnsZones[5].id

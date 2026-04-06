// ============================================================================
// Upcore V1 — Azure Cache for Redis (C1 Standard)
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

@description('Redis SKU name')
@allowed(['Basic', 'Standard', 'Premium'])
param skuName string = 'Standard'

@description('Redis SKU family')
@allowed(['C', 'P'])
param skuFamily string = 'C'

@description('Redis cache capacity (C0-C6 for Standard, P1-P5 for Premium)')
@minValue(0)
@maxValue(6)
param skuCapacity int = 1

@description('Subnet ID for private endpoint')
param privateEndpointSubnetId string

@description('Private DNS Zone ID for Redis')
param privateDnsZoneId string

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var redisName = 'upc-${environment}-redis'

// ---------------------------------------------------------------------------
// Azure Cache for Redis
// ---------------------------------------------------------------------------
resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  tags: tags
  properties: {
    sku: {
      name: skuName
      family: skuFamily
      capacity: skuCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    redisVersion: '7'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'maxmemory-reserved': '50'
      'maxfragmentationmemory-reserved': '50'
      'notify-keyspace-events': 'KEA'
    }
  }
}

// ---------------------------------------------------------------------------
// Private Endpoint
// ---------------------------------------------------------------------------
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'upc-${environment}-redis-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'upc-${environment}-redis-psc'
        properties: {
          privateLinkServiceId: redis.id
          groupIds: ['redisCache']
        }
      }
    ]
  }
}

resource privateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: privateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'redis'
        properties: {
          privateDnsZoneId: privateDnsZoneId
        }
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output redisId string = redis.id
output redisName string = redis.name
output redisHostName string = redis.properties.hostName
output redisSslPort int = redis.properties.sslPort
output redisPrimaryKey string = redis.listKeys().primaryKey
output redisConnectionString string = '${redis.properties.hostName}:${redis.properties.sslPort},password=${redis.listKeys().primaryKey},ssl=True,abortConnect=False'

// ============================================================================
// Upcore V1 — Azure Database for PostgreSQL Flexible Server
// 128 GB storage, pgvector extension enabled
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

@description('PostgreSQL administrator login')
param administratorLogin string = 'upcoreadmin'

@description('PostgreSQL administrator password')
@secure()
param administratorPassword string

@description('PostgreSQL SKU name')
param skuName string = 'Standard_D4ds_v5'

@description('PostgreSQL SKU tier')
@allowed(['Burstable', 'GeneralPurpose', 'MemoryOptimized'])
param skuTier string = 'GeneralPurpose'

@description('Storage size in GB')
param storageSizeGB int = 128

@description('Backup retention in days')
@minValue(7)
@maxValue(35)
param backupRetentionDays int = 35

@description('Enable geo-redundant backup')
param geoRedundantBackup bool = false

@description('Delegated subnet ID for PostgreSQL')
param delegatedSubnetId string

@description('Private DNS Zone ID for PostgreSQL')
param privateDnsZoneId string

@description('High availability mode')
@allowed(['Disabled', 'ZoneRedundant', 'SameZone'])
param highAvailabilityMode string = 'Disabled'

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var serverName = 'upc-${environment}-pg-flex'

// ---------------------------------------------------------------------------
// PostgreSQL Flexible Server
// ---------------------------------------------------------------------------
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: '16'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: geoRedundantBackup ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: highAvailabilityMode
    }
    network: {
      delegatedSubnetResourceId: delegatedSubnetId
      privateDnsZoneArmResourceId: privateDnsZoneId
      publicNetworkAccess: 'Disabled'
    }
    maintenanceWindow: {
      customWindow: 'Enabled'
      dayOfWeek: 0 // Sunday
      startHour: 2
      startMinute: 0
    }
  }
}

// ---------------------------------------------------------------------------
// Server Configuration — performance tuning & pgvector
// ---------------------------------------------------------------------------
var serverConfigurations = [
  { name: 'azure_extensions', value: 'vector,pg_stat_statements,pg_trgm,uuid-ossp,hstore,btree_gist' }
  { name: 'shared_preload_libraries', value: 'pg_stat_statements' }
  { name: 'max_connections', value: '200' }
  { name: 'shared_buffers', value: '1048576' } // 1GB in 8kB pages
  { name: 'effective_cache_size', value: '3145728' } // 3GB in 8kB pages
  { name: 'work_mem', value: '16384' } // 16MB in kB
  { name: 'maintenance_work_mem', value: '524288' } // 512MB in kB
  { name: 'log_min_duration_statement', value: '500' } // log slow queries > 500ms
  { name: 'log_statement', value: 'ddl' }
  { name: 'idle_in_transaction_session_timeout', value: '60000' } // 60s
  { name: 'statement_timeout', value: '300000' } // 5 min
  { name: 'timezone', value: 'Europe/Istanbul' }
]

resource configurations 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = [
  for config in serverConfigurations: {
    parent: postgresServer
    name: config.name
    properties: {
      value: config.value
      source: 'user-override'
    }
  }
]

// ---------------------------------------------------------------------------
// Database — upcore main database
// ---------------------------------------------------------------------------
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'upcore_${environment}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ---------------------------------------------------------------------------
// Firewall rule — allow Azure services (for migrations from GitHub Actions)
// ---------------------------------------------------------------------------
resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = if (environment != 'prod') {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output serverId string = postgresServer.id
output serverName string = postgresServer.name
output serverFqdn string = postgresServer.properties.fullyQualifiedDomainName
output databaseName string = database.name

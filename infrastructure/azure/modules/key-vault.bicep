// ============================================================================
// Upcore V1 — Azure Key Vault
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

@description('Azure AD tenant ID')
param tenantId string

@description('Principal IDs that get full secret access (Key Vault Secrets Officer)')
param adminPrincipalIds array = []

@description('Container app system-assigned managed identity principal IDs that need read-only secret access (Key Vault Secrets User). Each container-app.bicep modülü `principalId` output\'unu buraya feed eder.')
param containerAppPrincipalIds array = []

@description('Subnet ID for private endpoint')
param privateEndpointSubnetId string

@description('Private DNS Zone ID for Key Vault')
param privateDnsZoneId string

@description('Enable soft delete')
param enableSoftDelete bool = true

@description('Soft delete retention in days')
param softDeleteRetentionInDays int = 90

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var keyVaultName = 'upc-${environment}-kv'

// ---------------------------------------------------------------------------
// Key Vault
// ---------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenantId
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: enableSoftDelete
    softDeleteRetentionInDays: softDeleteRetentionInDays
    enablePurgeProtection: environment == 'prod' ? true : false
    enableRbacAuthorization: true
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// ---------------------------------------------------------------------------
// RBAC — Key Vault Secrets Officer for admin principals
// ---------------------------------------------------------------------------
//
// İki ayrı role kullanılıyor:
//   - Secrets Officer (b86a...): admin/CI principal — secret create/update.
//   - Secrets User    (4633...): container app system MI — sadece read.
//
// Az privilege prensibi: hiçbir runtime servis yazma yetkisi almamalı;
// secret rotasyonu ayrı bir CI rotation job'una verilir.
var secretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var secretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for (principalId, i) in adminPrincipalIds: {
    name: guid(keyVault.id, principalId, secretsOfficerRoleId)
    scope: keyVault
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsOfficerRoleId)
      principalId: principalId
      principalType: 'ServicePrincipal'
    }
  }
]

// Container apps system-assigned MI'lerine read-only access ver.
// principalType: 'ServicePrincipal' system MI için doğru atama (Microsoft
// dokümanına göre system MI bir "service principal" olarak temsil edilir).
resource containerAppRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for (principalId, i) in containerAppPrincipalIds: {
    name: guid(keyVault.id, principalId, secretsUserRoleId)
    scope: keyVault
    properties: {
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUserRoleId)
      principalId: principalId
      principalType: 'ServicePrincipal'
    }
  }
]

// ---------------------------------------------------------------------------
// Private Endpoint
// ---------------------------------------------------------------------------
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'upc-${environment}-kv-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'upc-${environment}-kv-psc'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: ['vault']
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
        name: 'vault'
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
output keyVaultId string = keyVault.id
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri

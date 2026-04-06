// ============================================================================
// Upcore V1 — Azure OpenAI Service with GPT-4o Deployment
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

@description('Azure OpenAI SKU')
param skuName string = 'S0'

@description('GPT-4o deployment capacity (TPM in thousands)')
param gpt4oCapacity int = 30

@description('Text embedding deployment capacity (TPM in thousands)')
param embeddingCapacity int = 120

@description('Subnet ID for private endpoint')
param privateEndpointSubnetId string

@description('Private DNS Zone ID for OpenAI')
param privateDnsZoneId string

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var accountName = 'upc-${environment}-openai'

// ---------------------------------------------------------------------------
// Azure OpenAI Cognitive Services Account
// ---------------------------------------------------------------------------
resource openai 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {
  name: accountName
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: skuName
  }
  properties: {
    customSubDomainName: accountName
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      ipRules: []
      virtualNetworkRules: []
    }
    disableLocalAuth: false
  }
}

// ---------------------------------------------------------------------------
// Model Deployments
// ---------------------------------------------------------------------------
resource gpt4oDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-04-01-preview' = {
  parent: openai
  name: 'gpt-4o'
  sku: {
    name: 'Standard'
    capacity: gpt4oCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-08-06'
    }
    raiPolicyName: 'Microsoft.DefaultV2'
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

resource gpt4oMiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-04-01-preview' = {
  parent: openai
  name: 'gpt-4o-mini'
  dependsOn: [gpt4oDeployment]
  sku: {
    name: 'Standard'
    capacity: 60
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
    raiPolicyName: 'Microsoft.DefaultV2'
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-04-01-preview' = {
  parent: openai
  name: 'text-embedding-3-large'
  dependsOn: [gpt4oMiniDeployment]
  sku: {
    name: 'Standard'
    capacity: embeddingCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-large'
      version: '1'
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

// ---------------------------------------------------------------------------
// Private Endpoint
// ---------------------------------------------------------------------------
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'upc-${environment}-openai-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'upc-${environment}-openai-psc'
        properties: {
          privateLinkServiceId: openai.id
          groupIds: ['account']
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
        name: 'openai'
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
output openaiId string = openai.id
output openaiName string = openai.name
output openaiEndpoint string = openai.properties.endpoint
output openaiPrimaryKey string = openai.listKeys().key1
output gpt4oDeploymentName string = gpt4oDeployment.name
output gpt4oMiniDeploymentName string = gpt4oMiniDeployment.name
output embeddingDeploymentName string = embeddingDeployment.name

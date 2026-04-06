// ============================================================================
// Upcore V1 — Azure Service Bus Premium Namespace + Topics
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

@description('Service Bus SKU')
@allowed(['Standard', 'Premium'])
param skuName string = 'Premium'

@description('Messaging units for Premium tier')
@allowed([1, 2, 4, 8, 16])
param messagingUnits int = 1

@description('Subnet ID for private endpoint')
param privateEndpointSubnetId string

@description('Private DNS Zone ID for Service Bus')
param privateDnsZoneId string

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var namespaceName = 'upc-${environment}-sb'

// Domain event topics and their subscriptions
var topics = [
  {
    name: 'employee-events'
    subscriptions: ['burnout-prediction', 'audit', 'notification', 'survey']
  }
  {
    name: 'survey-events'
    subscriptions: ['psychometric-scoring', 'burnout-prediction', 'audit', 'notification']
  }
  {
    name: 'leave-events'
    subscriptions: ['employee', 'audit', 'notification', 'burnout-prediction']
  }
  {
    name: 'assessment-events'
    subscriptions: ['psychometric-scoring', 'notification', 'audit', 'ats']
  }
  {
    name: 'burnout-events'
    subscriptions: ['intervention', 'action-center', 'notification', 'audit']
  }
  {
    name: 'intervention-events'
    subscriptions: ['employee', 'notification', 'audit']
  }
  {
    name: 'organization-events'
    subscriptions: ['employee', 'tenant', 'audit', 'notification']
  }
  {
    name: 'tenant-events'
    subscriptions: ['organization', 'audit', 'notification']
  }
  {
    name: 'document-events'
    subscriptions: ['employee', 'audit', 'notification']
  }
  {
    name: 'mobility-events'
    subscriptions: ['employee', 'recommendation', 'audit', 'notification']
  }
  {
    name: 'notification-commands'
    subscriptions: ['email', 'push', 'in-app']
  }
]

// ---------------------------------------------------------------------------
// Service Bus Namespace
// ---------------------------------------------------------------------------
resource namespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: namespaceName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuName
    capacity: skuName == 'Premium' ? messagingUnits : 0
  }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    disableLocalAuth: false
    zoneRedundant: environment == 'prod'
  }
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------
resource sbTopics 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = [
  for topic in topics: {
    parent: namespace
    name: topic.name
    properties: {
      maxSizeInMegabytes: 1024
      defaultMessageTimeToLive: 'P14D' // 14 days
      enablePartitioning: false
      enableBatchedOperations: true
      supportOrdering: true
      duplicateDetectionHistoryTimeWindow: 'PT10M'
      requiresDuplicateDetection: true
    }
  }
]

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
resource sbSubscriptions 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = [
  for item in flatten([
    for (topic, topicIndex) in topics: [
      for sub in topic.subscriptions: {
        topicIndex: topicIndex
        topicName: topic.name
        subscriptionName: sub
      }
    ]
  ]): {
    parent: sbTopics[item.topicIndex]
    name: item.subscriptionName
    properties: {
      maxDeliveryCount: 10
      lockDuration: 'PT1M'
      defaultMessageTimeToLive: 'P14D'
      deadLetteringOnMessageExpiration: true
      deadLetteringOnFilterEvaluationExceptions: true
      enableBatchedOperations: true
    }
  }
]

// ---------------------------------------------------------------------------
// Authorization Rules
// ---------------------------------------------------------------------------
resource sendRule 'Microsoft.ServiceBus/namespaces/authorizationRules@2022-10-01-preview' = {
  parent: namespace
  name: 'upcore-services-send'
  properties: {
    rights: ['Send']
  }
}

resource listenRule 'Microsoft.ServiceBus/namespaces/authorizationRules@2022-10-01-preview' = {
  parent: namespace
  name: 'upcore-services-listen'
  properties: {
    rights: ['Listen']
  }
}

resource manageRule 'Microsoft.ServiceBus/namespaces/authorizationRules@2022-10-01-preview' = {
  parent: namespace
  name: 'upcore-admin-manage'
  properties: {
    rights: ['Manage', 'Send', 'Listen']
  }
}

// ---------------------------------------------------------------------------
// Private Endpoint
// ---------------------------------------------------------------------------
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'upc-${environment}-sb-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'upc-${environment}-sb-psc'
        properties: {
          privateLinkServiceId: namespace.id
          groupIds: ['namespace']
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
        name: 'servicebus'
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
output namespaceId string = namespace.id
output namespaceName string = namespace.name
output namespaceFqdn string = '${namespace.name}.servicebus.windows.net'
output sendConnectionString string = sendRule.listKeys().primaryConnectionString
output listenConnectionString string = listenRule.listKeys().primaryConnectionString

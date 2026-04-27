// ============================================================================
// Upcore V1 — Reusable Container App Module (used per-service, 20x)
// ============================================================================

@description('Environment name')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to all resources')
param tags object = {}

@description('Container Apps Environment ID')
param containerAppsEnvId string

@description('Service name (e.g., auth, employee, survey)')
param serviceName string

@description('Container image (full GHCR path)')
param containerImage string

@description('Target port the container listens on')
param targetPort int

@description('CPU cores (e.g., 0.5, 1, 2)')
param cpu string = '0.5'

@description('Memory (e.g., 1Gi, 2Gi)')
param memory string = '1Gi'

@description('Min replicas')
@minValue(0)
@maxValue(30)
param minReplicas int = 1

@description('Max replicas')
@minValue(1)
@maxValue(30)
param maxReplicas int = 3

@description('Environment variables (non-secret)')
param envVars array = []

@description('Secret environment variables')
@secure()
param secrets array = []

@description('Workload profile name')
param workloadProfileName string = 'Consumption'

@description('Enable external ingress (only for gateway/web)')
param externalIngress bool = false

@description('Liveness probe path')
param healthCheckPath string = '/healthz'

@description('Readiness probe path')
param readinessCheckPath string = '/readyz'

@description('Startup probe path')
param startupCheckPath string = '/healthz'

@description('Container registry server')
param registryServer string = 'ghcr.io'

@description('Container registry username')
param registryUsername string = ''

@description('Container registry password')
@secure()
param registryPassword string = ''

@description('Key Vault URI for managed-identity secret references (e.g., https://upc-prod-kv.vault.azure.net/). Empty disables KV-backed secrets.')
param keyVaultUri string = ''

@description('Key Vault-backed secrets — pulled via system-assigned managed identity. Format: { name, keyVaultSecretName, envVarName }. App init reads them by `secretRef`. KV access RBAC ayrı modülde verilir.')
param keyVaultSecrets array = []

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var appName = 'upc-${environment}-${serviceName}'

var secretDefinitions = [
  for secret in secrets: {
    name: secret.name
    value: secret.value
  }
]

// Key Vault-backed secrets: değer container-app config'de tutulmaz, runtime'da
// system-assigned managed identity kullanılarak Key Vault'tan pull edilir.
// Container Apps platform secret'ı 5 dakikada bir cache'ler.
var kvSecretDefinitions = [
  for secret in keyVaultSecrets: {
    name: secret.name
    keyVaultUrl: '${keyVaultUri}secrets/${secret.keyVaultSecretName}'
    identity: 'system'
  }
]

var registrySecrets = !empty(registryPassword)
  ? [
      {
        name: 'registry-password'
        value: registryPassword
      }
    ]
  : []

var allSecrets = concat(secretDefinitions, kvSecretDefinitions, registrySecrets)

var secretEnvVars = [
  for secret in secrets: {
    name: secret.envVarName
    secretRef: secret.name
  }
]

var kvSecretEnvVars = [
  for secret in keyVaultSecrets: {
    name: secret.envVarName
    secretRef: secret.name
  }
]

var allEnvVars = concat(envVars, secretEnvVars, kvSecretEnvVars)

var registries = !empty(registryPassword)
  ? [
      {
        server: registryServer
        username: registryUsername
        passwordSecretRef: 'registry-password'
      }
    ]
  : []

// ---------------------------------------------------------------------------
// Container App
// ---------------------------------------------------------------------------
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: union(tags, {
    'upcore-service': serviceName
    'upcore-environment': environment
  })
  // System-assigned managed identity — Key Vault Secrets User RBAC bu
  // identity'ye verilir (key-vault.bicep'deki containerAppPrincipalIds).
  // Bu sayede container app secret değerlerini env var olarak değil,
  // runtime'da KV'den pull eder; CI/CD plain-text secret yaymaz.
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvId
    workloadProfileName: workloadProfileName
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: externalIngress
        targetPort: targetPort
        transport: 'http'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        corsPolicy: externalIngress
          ? {
              allowedOrigins: environment == 'prod'
                ? ['https://app.upcore.io']
                : ['https://${environment}.upcore.io', 'http://localhost:3000']
              allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
              allowedHeaders: ['*']
              allowCredentials: true
              maxAge: 3600
            }
          : null
      }
      secrets: allSecrets
      registries: registries
      maxInactiveRevisions: 5
    }
    template: {
      containers: [
        {
          name: serviceName
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: allEnvVars
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: healthCheckPath
                port: targetPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
              failureThreshold: 3
              timeoutSeconds: 5
            }
            {
              type: 'Readiness'
              httpGet: {
                path: readinessCheckPath
                port: targetPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
              timeoutSeconds: 5
            }
            {
              type: 'Startup'
              httpGet: {
                path: startupCheckPath
                port: targetPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 3
              periodSeconds: 5
              failureThreshold: 30
              timeoutSeconds: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
      revisionSuffix: uniqueString(containerImage)
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output appId string = containerApp.id
output appName string = containerApp.name
output appFqdn string = containerApp.properties.configuration.ingress.fqdn
output latestRevisionName string = containerApp.properties.latestRevisionName
// System-assigned managed identity principal ID — KV RBAC için kullanılır.
output principalId string = containerApp.identity.principalId

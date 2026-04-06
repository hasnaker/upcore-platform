// ============================================================================
// Upcore V1 — Azure Front Door + WAF Policy
// ============================================================================

@description('Environment name')
param environment string

@description('Tags applied to all resources')
param tags object = {}

@description('Container Apps Environment default domain')
param containerAppsDefaultDomain string

@description('Container Apps static IP')
param containerAppsStaticIp string

@description('Custom domain for the web app')
param customDomain string = ''

@description('WAF mode')
@allowed(['Detection', 'Prevention'])
param wafMode string = 'Prevention'

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------
var frontDoorName = 'upc-${environment}-fd'
var wafPolicyName = 'upc${environment}waf' // WAF names are alphanumeric only
var endpointName = 'upc-${environment}-endpoint'

// Origin groups: gateway (API) and web (Next.js)
var originGroups = [
  {
    name: 'api-gateway'
    originHost: 'upc-${environment}-api-gateway.${containerAppsDefaultDomain}'
    path: '/api/*'
    patterns: ['/api/*']
  }
  {
    name: 'web-app'
    originHost: 'upc-${environment}-web.${containerAppsDefaultDomain}'
    path: '/*'
    patterns: ['/*']
  }
]

// ---------------------------------------------------------------------------
// WAF Policy
// ---------------------------------------------------------------------------
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2024-02-01' = {
  name: wafPolicyName
  location: 'global'
  tags: tags
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: wafMode
      requestBodyCheck: 'Enabled'
      maxRequestBodySizeInKb: 128
      customBlockResponseStatusCode: 403
      customBlockResponseBody: base64('{"error":"blocked_by_waf","message":"Request blocked by web application firewall"}')
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
          ruleGroupOverrides: []
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.1'
          ruleSetAction: 'Block'
          ruleGroupOverrides: []
        }
      ]
    }
    customRules: {
      rules: [
        {
          name: 'RateLimitPerIP'
          priority: 100
          enabledState: 'Enabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: environment == 'prod' ? 1000 : 5000
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'RegEx'
              matchValue: ['.*']
              transforms: []
              negateCondition: false
            }
          ]
        }
        {
          name: 'BlockBadBots'
          priority: 200
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RequestHeader'
              selector: 'User-Agent'
              operator: 'Contains'
              matchValue: ['sqlmap', 'nikto', 'nessus', 'dirbuster', 'havij']
              transforms: ['Lowercase']
              negateCondition: false
            }
          ]
        }
        {
          name: 'BlockSQLInjectionInQuery'
          priority: 300
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'QueryString'
              operator: 'RegEx'
              matchValue: [
                '(union|select|insert|delete|drop|update|exec|execute|xp_|sp_|0x)'
              ]
              transforms: ['Lowercase', 'UrlDecode']
              negateCondition: false
            }
          ]
        }
      ]
    }
  }
}

// ---------------------------------------------------------------------------
// Front Door Profile
// ---------------------------------------------------------------------------
resource frontDoor 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: frontDoorName
  location: 'global'
  tags: tags
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    originResponseTimeoutSeconds: 60
  }
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------
resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: frontDoor
  name: endpointName
  location: 'global'
  tags: tags
  properties: {
    enabledState: 'Enabled'
  }
}

// ---------------------------------------------------------------------------
// Origin Groups
// ---------------------------------------------------------------------------
resource apiOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: frontDoor
  name: 'api-gateway'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/healthz'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 30
    }
    sessionAffinityState: 'Disabled'
  }
}

resource webOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: frontDoor
  name: 'web-app'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 30
    }
    sessionAffinityState: 'Disabled'
  }
}

// ---------------------------------------------------------------------------
// Origins
// ---------------------------------------------------------------------------
resource apiOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: apiOriginGroup
  name: 'api-gateway-origin'
  properties: {
    hostName: originGroups[0].originHost
    httpPort: 80
    httpsPort: 443
    originHostHeader: originGroups[0].originHost
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource webOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: webOriginGroup
  name: 'web-app-origin'
  properties: {
    hostName: originGroups[1].originHost
    httpPort: 80
    httpsPort: 443
    originHostHeader: originGroups[1].originHost
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
resource apiRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: endpoint
  name: 'api-route'
  dependsOn: [apiOrigin]
  properties: {
    originGroup: {
      id: apiOriginGroup.id
    }
    supportedProtocols: ['Https']
    patternsToMatch: ['/api/*']
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'application/json'
          'application/javascript'
          'text/html'
          'text/css'
          'text/plain'
        ]
      }
    }
  }
}

resource webRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: endpoint
  name: 'web-route'
  dependsOn: [webOrigin]
  properties: {
    originGroup: {
      id: webOriginGroup.id
    }
    supportedProtocols: ['Https']
    patternsToMatch: ['/*']
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreSpecifiedQueryStrings'
      queryParameters: '_rsc'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'application/json'
          'application/javascript'
          'text/html'
          'text/css'
          'text/plain'
          'image/svg+xml'
        ]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Security Policy — attach WAF to endpoint
// ---------------------------------------------------------------------------
resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-02-01' = {
  parent: frontDoor
  name: 'upc-${environment}-security-policy'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicy.id
      }
      associations: [
        {
          domains: [
            {
              id: endpoint.id
            }
          ]
          patternsToMatch: ['/*']
        }
      ]
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
output frontDoorId string = frontDoor.id
output frontDoorName string = frontDoor.name
output endpointHostName string = endpoint.properties.hostName
output endpointId string = endpoint.id
output wafPolicyId string = wafPolicy.id

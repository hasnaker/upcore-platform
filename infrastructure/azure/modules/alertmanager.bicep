// ============================================================================
// Alertmanager — Prometheus Alertmanager as Azure Container App
// ----------------------------------------------------------------------------
// Prometheus (Azure Managed Prometheus) → pushes alerts → bu ACA →
// PagerDuty + Slack routing. Config: `observability/alertmanager/alertmanager.yml`.
//
// Not: Azure Monitor Action Group ek bir backup channel — bu ACA down'sa
// bile e-posta + SMS gönderir.
// ============================================================================

@description('Environment name (prod/staging)')
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Tags applied to resource')
param tags object = {}

@description('Container Apps Managed Environment ID')
param containerAppsEnvironmentId string

@description('Log Analytics workspace ID (for observability)')
param logAnalyticsWorkspaceId string = ''

@description('PagerDuty P0 service key (secret reference)')
@secure()
param pagerdutyP0Key string

@description('PagerDuty P1 service key (secret reference)')
@secure()
param pagerdutyP1Key string

@description('Slack incidents webhook URL')
@secure()
param slackIncidentsWebhook string

@description('Slack alerts webhook URL')
@secure()
param slackAlertsWebhook string

@description('Slack noise webhook URL')
@secure()
param slackNoiseWebhook string

@description('Alertmanager image')
param image string = 'prom/alertmanager:v0.27.0'

// ---------------------------------------------------------------------------
var appName = 'upc-${environment}-alertmanager'

resource alertmanager 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  properties: {
    environmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false // internal only — Prometheus pushes to it via VNet
        targetPort: 9093
        transport: 'auto'
        allowInsecure: false
      }
      secrets: [
        { name: 'pagerduty-p0',      value: pagerdutyP0Key }
        { name: 'pagerduty-p1',      value: pagerdutyP1Key }
        { name: 'slack-incidents',   value: slackIncidentsWebhook }
        { name: 'slack-alerts',      value: slackAlertsWebhook }
        { name: 'slack-noise',       value: slackNoiseWebhook }
      ]
    }
    template: {
      containers: [
        {
          name: 'alertmanager'
          image: image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          args: [
            '--config.file=/etc/alertmanager/alertmanager.yml'
            '--storage.path=/alertmanager'
            '--web.external-url=https://alertmanager.upcore.io'
            '--log.level=info'
          ]
          env: [
            { name: 'PAGERDUTY_SERVICE_KEY_P0',  secretRef: 'pagerduty-p0' }
            { name: 'PAGERDUTY_SERVICE_KEY_P1',  secretRef: 'pagerduty-p1' }
            { name: 'SLACK_WEBHOOK_INCIDENTS',   secretRef: 'slack-incidents' }
            { name: 'SLACK_WEBHOOK_ALERTS',      secretRef: 'slack-alerts' }
            { name: 'SLACK_WEBHOOK_NOISE',       secretRef: 'slack-noise' }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: { path: '/-/ready', port: 9093 }
              periodSeconds: 15
              failureThreshold: 3
            }
            {
              type: 'Liveness'
              httpGet: { path: '/-/healthy', port: 9093 }
              periodSeconds: 30
              failureThreshold: 5
            }
          ]
        }
      ]
      scale: {
        minReplicas: 2 // HA — Alertmanager cluster mode iki node
        maxReplicas: 2
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Azure Monitor Action Group — backup channel (Alertmanager down olsa bile
// çalışır). Hasan için e-posta + SMS.
// ---------------------------------------------------------------------------
resource actionGroup 'Microsoft.Insights/actionGroups@2023-09-01-preview' = {
  name: 'upc-${environment}-oncall-ag'
  location: 'global'
  tags: tags
  properties: {
    groupShortName: 'upcOnCall'
    enabled: true
    emailReceivers: [
      {
        name: 'hasan-email'
        emailAddress: 'gozesalih38@gmail.com'
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: [
      {
        name: 'hasan-sms'
        countryCode: '90'
        phoneNumber: '5XXXXXXXXX' // TODO Hasan: telefon numarası doldur
      }
    ]
    webhookReceivers: [
      {
        name: 'alertmanager-backup'
        serviceUri: 'https://${alertmanager.properties.configuration.ingress.fqdn}/api/v1/alerts'
        useCommonAlertSchema: true
      }
    ]
  }
}

// ---------------------------------------------------------------------------
output alertmanagerFqdn string = alertmanager.properties.configuration.ingress.fqdn
output actionGroupId string = actionGroup.id

// ============================================================================
// Status Page — Azure Static Web Apps
// ----------------------------------------------------------------------------
// status.upcore.io ana platformdan **farklı** bir region'da (swedencentral)
// deploy edilir — westeurope region-level outage'da bile status page ayakta
// kalmalı.
//
// Build & deploy: `.github/workflows/deploy-status.yml`
// Source: `apps/status/`
// ============================================================================

@description('Environment name')
param environment string = 'prod'

@description('Region — FARKLI bir region seç (main platform westeurope).')
param location string = 'swedencentral'

@description('Tags')
param tags object = {}

@description('Custom domain — CNAME target')
param customDomain string = 'status.upcore.io'

@description('GitHub repo URL')
param repositoryUrl string = 'https://github.com/upcore/upcore-platform'

@description('Branch')
param branch string = 'main'

@description('Application code path inside the repo')
param appLocation string = 'apps/status'

@description('Next.js output (standalone) path')
param outputLocation string = '.next'

@description('Node build API location (none for static)')
param apiLocation string = ''

// ---------------------------------------------------------------------------
var staticSiteName = 'upc-${environment}-status-swa'

resource staticSite 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticSiteName
  location: location
  tags: tags
  sku: {
    // Free tier — 100 GB bandwidth/month yeterli; incident'ta artarsa Standard'a yükselt.
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: appLocation
      outputLocation: outputLocation
      apiLocation: apiLocation
      appBuildCommand: 'pnpm --filter @upcore/status build'
    }
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
    provider: 'GitHub'
  }
}

// ---------------------------------------------------------------------------
// Custom domain binding — CNAME Cloudflare'de manuel kurulur:
//   status.upcore.io  →  <staticSite.defaultHostname>
// ---------------------------------------------------------------------------
resource customDomainBinding 'Microsoft.Web/staticSites/customDomains@2023-12-01' = {
  parent: staticSite
  name: customDomain
  properties: {
    validationMethod: 'cname-delegation'
  }
}

// ---------------------------------------------------------------------------
output staticSiteId string = staticSite.id
output defaultHostname string = staticSite.properties.defaultHostname
output customDomainName string = customDomain
// Deploy token — GitHub Actions secret (AZURE_STATIC_WEB_APPS_STATUS_TOKEN)
// olarak repo'ya eklenmelidir. Bu output'ta plaintext dönmez — `az staticwebapp secrets list`
// komutu ile al.

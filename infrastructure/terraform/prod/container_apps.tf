# ============================================================================
# Container Apps — 17 Go microservice + 2 Next.js app
# AKS yerine Container Apps (quota + maliyet nedeniyle).
# Image'lar ACR'de upcoreprodacr.azurecr.io/upcore-<svc>:<tag>
# DB: VNet-injected PG, Container App Env aynı VNet'te, private FQDN ile erişir.
# ============================================================================

# ACR'ye Container App Env pull yetkisi için managed identity
resource "azurerm_user_assigned_identity" "apps" {
  name                = "upcore-prod-apps-identity"
  resource_group_name = azurerm_resource_group.prod.name
  location            = azurerm_resource_group.prod.location
  tags                = local.tags
}

resource "azurerm_role_assignment" "apps_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

resource "azurerm_role_assignment" "apps_kv_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

# DB URL secret — container apps secret store'dan bind edilir
resource "random_password" "internal_jwt_key" {
  length  = 64
  special = false
}

resource "azurerm_key_vault_secret" "db_url" {
  name         = "db-url"
  value        = "postgres://upcore_admin:${random_password.pg_admin.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/upcore?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_role_assignment.kv_admin, azurerm_postgresql_flexible_server_database.upcore]
}

resource "azurerm_key_vault_secret" "servicebus_conn" {
  name         = "servicebus-conn"
  value        = azurerm_servicebus_namespace.main.default_primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

resource "azurerm_key_vault_secret" "internal_jwt" {
  name         = "internal-jwt-key"
  value        = random_password.internal_jwt_key.result
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

# ---------------------------------------------------------------------------
# Servis listesi — port + ingress + resource profilleri
# ---------------------------------------------------------------------------

locals {
  go_services = {
    api-gateway  = { port = 8080, replicas_min = 1, replicas_max = 5, external_ingress = true,  cpu = 0.5, memory = "1Gi" }
    auth         = { port = 8001, replicas_min = 1, replicas_max = 3, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    tenant       = { port = 8002, replicas_min = 1, replicas_max = 3, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    employee     = { port = 8003, replicas_min = 1, replicas_max = 3, external_ingress = false, cpu = 0.5, memory = "1Gi" }
    organization = { port = 8004, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    leave        = { port = 8005, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    document     = { port = 8006, replicas_min = 1, replicas_max = 3, external_ingress = false, cpu = 0.5, memory = "1Gi" }
    survey       = { port = 8007, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    intervention = { port = 8008, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    audit        = { port = 8009, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    notification = { port = 8010, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    ats          = { port = 8011, replicas_min = 1, replicas_max = 3, external_ingress = false, cpu = 0.5, memory = "1Gi" }
    assessment   = { port = 8012, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    mobility     = { port = 8013, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    performance  = { port = 8014, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
    bordro       = { port = 8015, replicas_min = 1, replicas_max = 3, external_ingress = false, cpu = 0.5, memory = "1Gi" }
    billing      = { port = 8016, replicas_min = 1, replicas_max = 2, external_ingress = false, cpu = 0.25, memory = "0.5Gi" }
  }

  web_apps = {
    web = { port = 3000, replicas_min = 1, replicas_max = 3, cpu = 0.5, memory = "1Gi" }
  }

  image_tag = "v0.1.0"
}

# ---------------------------------------------------------------------------
# Go servisleri için şablon
# ---------------------------------------------------------------------------

resource "azurerm_container_app" "go_svc" {
  for_each = local.go_services

  name                         = "upcore-${each.key}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.prod.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.apps.id
  }

  secret {
    name                = "db-url"
    identity            = azurerm_user_assigned_identity.apps.id
    key_vault_secret_id = azurerm_key_vault_secret.db_url.id
  }
  secret {
    name                = "servicebus-conn"
    identity            = azurerm_user_assigned_identity.apps.id
    key_vault_secret_id = azurerm_key_vault_secret.servicebus_conn.id
  }
  secret {
    name                = "internal-jwt"
    identity            = azurerm_user_assigned_identity.apps.id
    key_vault_secret_id = azurerm_key_vault_secret.internal_jwt.id
  }

  template {
    min_replicas = each.value.replicas_min
    max_replicas = each.value.replicas_max

    container {
      name   = each.key
      image  = "${azurerm_container_registry.main.login_server}/upcore-${each.key}:${local.image_tag}"
      cpu    = each.value.cpu
      memory = each.value.memory

      env {
        name  = "PORT"
        value = tostring(each.value.port)
      }
      env {
        name  = "ENVIRONMENT"
        value = "production"
      }
      env {
        name  = "LOG_LEVEL"
        value = "info"
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "db-url"
      }
      env {
        name        = "SERVICE_BUS_CONNECTION_STRING"
        secret_name = "servicebus-conn"
      }
      env {
        name        = "INTERNAL_JWT_KEY"
        secret_name = "internal-jwt"
      }
    }

    # Basit HTTP auto-scale kuralı
    http_scale_rule {
      name                = "http-scale"
      concurrent_requests = 50
    }
  }

  dynamic "ingress" {
    for_each = each.value.external_ingress ? [1] : [1] # internal VEYA external
    content {
      external_enabled = each.value.external_ingress
      target_port      = each.value.port
      transport        = "http"
      traffic_weight {
        latest_revision = true
        percentage      = 100
      }
    }
  }

  depends_on = [
    azurerm_role_assignment.apps_acr_pull,
    azurerm_role_assignment.apps_kv_secrets,
  ]
}

# ---------------------------------------------------------------------------
# Next.js (web + admin)
# ---------------------------------------------------------------------------

resource "azurerm_container_app" "web" {
  for_each = local.web_apps

  name                         = "upcore-${each.key}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.prod.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.apps.id
  }

  template {
    min_replicas = each.value.replicas_min
    max_replicas = each.value.replicas_max

    container {
      name   = each.key
      image  = "${azurerm_container_registry.main.login_server}/upcore-${each.key}:${local.image_tag}"
      cpu    = each.value.cpu
      memory = each.value.memory

      env {
        name  = "PORT"
        value = tostring(each.value.port)
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }

    http_scale_rule {
      name                = "http-scale"
      concurrent_requests = 100
    }
  }

  ingress {
    external_enabled = true
    target_port      = each.value.port
    transport        = "http"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  depends_on = [azurerm_role_assignment.apps_acr_pull]
}

# Outputs — public URL'leri
output "gateway_url" { value = try("https://${azurerm_container_app.go_svc["api-gateway"].ingress[0].fqdn}", null) }
output "web_url"     { value = try("https://${azurerm_container_app.web["web"].ingress[0].fqdn}", null) }
output "admin_url"   { value = try("https://${azurerm_container_app.web["admin"].ingress[0].fqdn}", null) }

# UpCore Production — Azure TR Central
# Tüm müşteri verisi TR Central'da; NE'de warm-standby geo-replica.
# Apply sırası:
#   terraform init -backend-config=backend.tfvars
#   terraform plan -var-file=prod.tfvars
#   terraform apply -var-file=prod.tfvars

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  backend "azurerm" {
    # backend.tfvars içinde:
    #   resource_group_name  = "upcore-tfstate"
    #   storage_account_name = "upcoretfstate"
    #   container_name       = "tfstate"
    #   key                  = "prod.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }
  subscription_id = var.subscription_id
}

# ---------------------------------------------------------------------------
# Resource Group
# ---------------------------------------------------------------------------

resource "azurerm_resource_group" "prod" {
  name     = "upcore-prod-${var.location_short}"
  location = var.location
  tags = merge(local.tags, {
    environment = "production"
    criticality = "high"
  })
}

# ---------------------------------------------------------------------------
# Network — private VNet, subnet'ler
# ---------------------------------------------------------------------------

resource "azurerm_virtual_network" "prod" {
  name                = "upcore-prod-vnet"
  resource_group_name = azurerm_resource_group.prod.name
  location            = azurerm_resource_group.prod.location
  address_space       = ["10.10.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "apps" {
  name                 = "apps"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.prod.name
  address_prefixes     = ["10.10.1.0/24"]

  delegation {
    name = "app-env"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "db" {
  name                 = "db"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.prod.name
  address_prefixes     = ["10.10.2.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "pg"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Ad-hoc jump host'lar (migration, debug ACI'leri) için subnet.
resource "azurerm_subnet" "jumphosts" {
  name                 = "jumphosts"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.prod.name
  address_prefixes     = ["10.10.3.0/24"]

  delegation {
    name = "aci"
    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# ---------------------------------------------------------------------------
# PostgreSQL Flexible Server — HA + PITR 35 gün
# Private DNS zone VNet-injected mode'da zorunlu.
# ---------------------------------------------------------------------------

resource "azurerm_private_dns_zone" "pg" {
  name                = "upcore-prod.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.prod.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "pg" {
  name                  = "upcore-pg-dns-link"
  resource_group_name   = azurerm_resource_group.prod.name
  private_dns_zone_name = azurerm_private_dns_zone.pg.name
  virtual_network_id    = azurerm_virtual_network.prod.id
  registration_enabled  = false
}

resource "random_password" "pg_admin" {
  length      = 32
  special     = true
  min_numeric = 3
  min_upper   = 3
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "upcore-prod-pg"
  resource_group_name    = azurerm_resource_group.prod.name
  location               = azurerm_resource_group.prod.location
  version                = "16"
  sku_name               = var.pg_sku_name
  storage_mb             = var.pg_storage_mb
  backup_retention_days  = 35
  geo_redundant_backup_enabled = true
  zone                   = "1"
  delegated_subnet_id    = azurerm_subnet.db.id
  private_dns_zone_id    = azurerm_private_dns_zone.pg.id
  public_network_access_enabled = false
  administrator_login    = "upcore_admin"
  administrator_password = random_password.pg_admin.result

  depends_on = [azurerm_private_dns_zone_virtual_network_link.pg]

  # NOT: Multi-Zone HA bu subscription'da restricted (support request ile açılır).
  # Quota geldiğinde high_availability { mode="ZoneRedundant" } geri eklenecek.
  # Single-zone + yedekli storage ile ilk müşteri için 99.99% SLA yeterli.

  tags = local.tags
}

resource "azurerm_postgresql_flexible_server_database" "upcore" {
  name      = "upcore"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_configuration" "pgcrypto" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "PGCRYPTO,UUID-OSSP,VECTOR"
}

# ---------------------------------------------------------------------------
# Key Vault — secrets + keys
# ---------------------------------------------------------------------------

resource "azurerm_key_vault" "main" {
  name                        = "upcore-prod-kv"
  resource_group_name         = azurerm_resource_group.prod.name
  location                    = azurerm_resource_group.prod.location
  tenant_id                   = var.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  enable_rbac_authorization   = true
  tags                        = local.tags
}

data "azurerm_client_config" "current" {}

# Terraform runner'a KV üzerinde secret yazma yetkisi. RBAC authorization
# açıkken bu role assignment olmadan Vault'a secret eklenemez.
resource "azurerm_role_assignment" "kv_admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_key_vault_secret" "pg_admin_password" {
  name         = "pg-admin-password"
  value        = random_password.pg_admin.result
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_role_assignment.kv_admin]
}

# ---------------------------------------------------------------------------
# Storage — Blob (documents + tenant exports)
# ---------------------------------------------------------------------------

resource "azurerm_storage_account" "blobs" {
  name                     = "upcoreprodblobs"
  resource_group_name      = azurerm_resource_group.prod.name
  location                 = azurerm_resource_group.prod.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = true
    delete_retention_policy { days = 30 }
    container_delete_retention_policy { days = 30 }
  }

  tags = local.tags
}

resource "azurerm_storage_container" "documents" {
  name                  = "documents"
  storage_account_name  = azurerm_storage_account.blobs.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "exports" {
  name                  = "tenant-exports"
  storage_account_name  = azurerm_storage_account.blobs.name
  container_access_type = "private"
}

# ---------------------------------------------------------------------------
# Service Bus — events (premium tier, geo-DR capable)
# ---------------------------------------------------------------------------

resource "azurerm_servicebus_namespace" "main" {
  name                          = "upcore-prod-events"
  resource_group_name           = azurerm_resource_group.prod.name
  location                      = azurerm_resource_group.prod.location
  sku                           = "Premium"
  capacity                      = 1
  premium_messaging_partitions  = 1
  tags                          = local.tags
}

# ---------------------------------------------------------------------------
# Container Apps Environment
# ---------------------------------------------------------------------------

resource "azurerm_log_analytics_workspace" "main" {
  name                = "upcore-prod-logs"
  resource_group_name = azurerm_resource_group.prod.name
  location            = azurerm_resource_group.prod.location
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = local.tags
}

resource "azurerm_container_app_environment" "main" {
  name                       = "upcore-prod-apps"
  resource_group_name        = azurerm_resource_group.prod.name
  location                   = azurerm_resource_group.prod.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  infrastructure_subnet_id   = azurerm_subnet.apps.id
  tags                       = local.tags

  # Azure bu alanları otomatik doldurur; Terraform diff'inden ignore et
  # ki her apply'da replace olmasın.
  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name,
      workload_profile,
    ]
  }
}

# ---------------------------------------------------------------------------
# Azure Container Registry
# ---------------------------------------------------------------------------

resource "azurerm_container_registry" "main" {
  name                = "upcoreprodacr"
  resource_group_name = azurerm_resource_group.prod.name
  location            = azurerm_resource_group.prod.location
  sku                 = "Premium"
  admin_enabled       = false
  tags                = local.tags
}

# ---------------------------------------------------------------------------
# Front Door (CDN + WAF + TLS termination)
# ---------------------------------------------------------------------------

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "upcore-prod-fd"
  resource_group_name = azurerm_resource_group.prod.name
  sku_name            = "Standard_AzureFrontDoor"
  tags                = local.tags
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "resource_group"          { value = azurerm_resource_group.prod.name }
output "pg_server_fqdn"          { value = azurerm_postgresql_flexible_server.main.fqdn }
output "acr_login_server"        { value = azurerm_container_registry.main.login_server }
output "blob_endpoint"           { value = azurerm_storage_account.blobs.primary_blob_endpoint }
output "servicebus_namespace"    { value = azurerm_servicebus_namespace.main.name }
output "container_env_id"        { value = azurerm_container_app_environment.main.id }
output "key_vault_id"            { value = azurerm_key_vault.main.id }

locals {
  tags = {
    project     = "upcore"
    managed_by  = "terraform"
    owner       = "sre"
    cost_center = "R&D"
  }
}

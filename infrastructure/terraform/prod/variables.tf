variable "subscription_id" {
  type        = string
  description = "Azure subscription UUID — `az account show --query id`"
}

variable "tenant_id" {
  type        = string
  description = "Azure AD tenant UUID — `az account show --query tenantId`"
}

variable "location" {
  type    = string
  default = "North Europe"
}

variable "location_short" {
  type    = string
  default = "neu"
}

variable "pg_sku_name" {
  type        = string
  default     = "GP_Standard_D2s_v3"
  description = "Production tier: D2s (2 vCPU, 8GB RAM) baseline; scale on demand"
}

variable "pg_storage_mb" {
  type    = number
  default = 131072 # 128 GB
}

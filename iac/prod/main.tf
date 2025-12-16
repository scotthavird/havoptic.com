terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Get zone information
data "cloudflare_zone" "main" {
  name = var.domain
}

locals {
  zone_id     = data.cloudflare_zone.main.id
  environment = "prod"
  app_name    = "havoptic"
  namespace   = "${local.app_name}-${local.environment}"

  web_pages_name = "${local.namespace}-web"
}

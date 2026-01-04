# Havoptic Storage Infrastructure - Production
# R2 bucket for newsletter subscriber storage

resource "cloudflare_r2_bucket" "newsletter" {
  account_id = var.cloudflare_account_id
  name       = "${local.namespace}-newsletter"
  location   = "WNAM" # Western North America
}

# Havoptic - Terraform Variables (Development)

variable "cloudflare_api_token" {
  description = "Cloudflare API token with necessary permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "domain" {
  description = "Primary domain for Havoptic"
  type        = string
  default     = "havoptic.com"
}

variable "github_owner" {
  description = "GitHub organization or username"
  type        = string
  default     = "scotthavird"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "havoptic.com"
}

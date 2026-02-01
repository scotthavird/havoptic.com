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

# AWS Configuration
variable "aws_region" {
  description = "AWS region for SES"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS credentials profile from ~/.aws/credentials"
  type        = string
  default     = "default"
}

variable "newsletter_from_email" {
  description = "Email address for sending newsletters"
  type        = string
  default     = "newsletter@havoptic.com"
}

variable "notify_api_key" {
  description = "API key for authenticating notification requests"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Admin email for receiving subscribe/unsubscribe notifications"
  type        = string
  sensitive   = true
}

# GitHub OAuth Configuration
variable "github_oauth_client_id" {
  description = "GitHub OAuth App Client ID"
  type        = string
  sensitive   = true
}

variable "github_oauth_client_secret" {
  description = "GitHub OAuth App Client Secret"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Secret key for signing session tokens"
  type        = string
  sensitive   = true
}

# Web Push VAPID Configuration
variable "vapid_public_key" {
  description = "VAPID public key for Web Push notifications (base64url encoded)"
  type        = string
  sensitive   = false
}

variable "vapid_private_key" {
  description = "VAPID private key for Web Push notifications (base64url encoded PKCS8)"
  type        = string
  sensitive   = true
}

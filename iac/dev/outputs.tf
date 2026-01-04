# Havoptic - Terraform Outputs (Development)

output "pages_project_name" {
  description = "Cloudflare Pages project name"
  value       = cloudflare_pages_project.main.name
}

output "pages_url" {
  description = "Cloudflare Pages default URL"
  value       = "https://${cloudflare_pages_project.main.name}.pages.dev"
}

output "dev_url" {
  description = "Development URL"
  value       = "https://dev.${var.domain}"
}

output "zone_id" {
  description = "Cloudflare Zone ID"
  value       = local.zone_id
}

output "newsletter_bucket_name" {
  description = "R2 bucket name for newsletter subscribers"
  value       = cloudflare_r2_bucket.newsletter.name
}

# SES Outputs
output "ses_domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

output "ses_sender_access_key_id" {
  description = "Access key ID for SES sender IAM user"
  value       = aws_iam_access_key.ses_sender.id
  sensitive   = true
}

output "ses_sender_secret_access_key" {
  description = "Secret access key for SES sender IAM user"
  value       = aws_iam_access_key.ses_sender.secret
  sensitive   = true
}

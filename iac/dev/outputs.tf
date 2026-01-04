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

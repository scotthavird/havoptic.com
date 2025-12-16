# Havoptic - Terraform Outputs (Production)

output "pages_project_name" {
  description = "Cloudflare Pages project name"
  value       = cloudflare_pages_project.main.name
}

output "pages_url" {
  description = "Cloudflare Pages default URL"
  value       = "https://${cloudflare_pages_project.main.name}.pages.dev"
}

output "production_url" {
  description = "Production URL"
  value       = "https://${var.domain}"
}

output "zone_id" {
  description = "Cloudflare Zone ID"
  value       = local.zone_id
}

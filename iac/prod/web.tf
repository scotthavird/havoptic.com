# Havoptic Web (Pages) Infrastructure - Production

# Pages Project
resource "cloudflare_pages_project" "main" {
  account_id        = var.cloudflare_account_id
  name              = local.web_pages_name
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = ""
  }

  source {
    type = "github"
    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = "main"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
    }
  }
}

# Custom domain for Pages (root domain)
resource "cloudflare_pages_domain" "root" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.main.name
  domain       = var.domain
}

# Custom domain for Pages (www subdomain)
resource "cloudflare_pages_domain" "www" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.main.name
  domain       = "www.${var.domain}"
}

# DNS Records for Pages custom domains
resource "cloudflare_record" "root" {
  zone_id = data.cloudflare_zone.main.id
  name    = "@"
  content = "${local.web_pages_name}.pages.dev"
  type    = "CNAME"
  proxied = true
  comment = "Root domain for ${local.namespace} web"
}

resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  content = "${local.web_pages_name}.pages.dev"
  type    = "CNAME"
  proxied = true
  comment = "WWW subdomain for ${local.namespace} web"
}

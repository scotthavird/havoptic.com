# Havoptic Web (Pages) Infrastructure - Development

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
      production_deployment_enabled = false
    }
  }

  deployment_configs {
    preview {
      r2_buckets = {
        NEWSLETTER_BUCKET = cloudflare_r2_bucket.newsletter.name
      }
      secrets = {
        AWS_ACCESS_KEY_ID     = aws_iam_access_key.ses_sender.id
        AWS_SECRET_ACCESS_KEY = aws_iam_access_key.ses_sender.secret
        AWS_REGION            = var.aws_region
        NOTIFY_API_KEY        = var.notify_api_key
      }
    }
    production {
      r2_buckets = {
        NEWSLETTER_BUCKET = cloudflare_r2_bucket.newsletter.name
      }
      secrets = {
        AWS_ACCESS_KEY_ID     = aws_iam_access_key.ses_sender.id
        AWS_SECRET_ACCESS_KEY = aws_iam_access_key.ses_sender.secret
        AWS_REGION            = var.aws_region
        NOTIFY_API_KEY        = var.notify_api_key
      }
    }
  }
}

# Custom domain for Pages (dev subdomain)
resource "cloudflare_pages_domain" "dev" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.main.name
  domain       = "dev.${var.domain}"
}

# DNS Record for Pages dev custom domain
resource "cloudflare_record" "dev" {
  zone_id = data.cloudflare_zone.main.id
  name    = "dev"
  content = "${local.web_pages_name}.pages.dev"
  type    = "CNAME"
  proxied = true
  comment = "Dev subdomain for ${local.namespace} web"
}

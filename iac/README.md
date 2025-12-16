# Havoptic - Infrastructure as Code

Terraform configuration for Havoptic Cloudflare resources.

## Structure

```
iac/
├── dev/      # Development environment
└── prod/     # Production environment
```

## Prerequisites

1. **Domain in Cloudflare**: `havoptic.com` must be added to your Cloudflare account
2. **API Token**: With permissions for Zone, DNS, and Cloudflare Pages

## Quick Start

### 1. Add Domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Click "Add a Site" -> enter `havoptic.com`
3. Select Free plan
4. Update nameservers at your domain registrar

### 2. Create API Token

Go to Cloudflare Dashboard -> Profile -> API Tokens -> Create Token:

| Permission | Resource | Access |
|------------|----------|--------|
| Account | Cloudflare Pages | Edit |
| Zone | Zone | Read |
| Zone | DNS | Edit |

Zone Resources: Include -> Specific zone -> `havoptic.com`

### 3. Setup Production

```bash
cd iac/prod
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your account ID

export TF_VAR_cloudflare_api_token="your-token-here"

terraform init
terraform plan
terraform apply
```

### 4. Setup Development

```bash
cd iac/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your account ID

export TF_VAR_cloudflare_api_token="your-token-here"

terraform init
terraform plan
terraform apply
```

## What Gets Created

| Resource | Dev | Prod |
|----------|-----|------|
| Pages Project | havoptic-dev-web | havoptic-prod-web |
| Web Domain | dev.havoptic.com | havoptic.com, www.havoptic.com |

## Final URLs

**Production:**
- https://havoptic.com
- https://www.havoptic.com

**Development:**
- https://dev.havoptic.com

## Importing Existing Resources

If you've already created the Pages project via wrangler or the dashboard, import it:

```bash
# Get your account ID
npx wrangler whoami

# Import existing Pages project (replace ACCOUNT_ID)
terraform import cloudflare_pages_project.main ACCOUNT_ID/havoptic-prod-web
```

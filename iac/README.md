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
2. **Cloudflare API Token**: With permissions for Zone, DNS, Cloudflare Pages, and R2 Storage
3. **AWS Account**: For SES email sending (credentials in `~/.aws/credentials`)

## Quick Start

### 1. Add Domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Click "Add a Site" -> enter `havoptic.com`
3. Select Free plan
4. Update nameservers at your domain registrar

### 2. Create Cloudflare API Token

Go to Cloudflare Dashboard -> Profile -> API Tokens -> Create Token:

| Scope | Permission | Resource | Access |
|-------|------------|----------|--------|
| Account | Cloudflare Pages | All accounts | Edit |
| Account | R2 Storage | All accounts | Edit |
| Zone | Zone | havoptic.com | Read |
| Zone | DNS | havoptic.com | Edit |

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
| R2 Bucket | havoptic-dev-newsletter | havoptic-prod-newsletter |
| SES Domain Identity | havoptic.com | havoptic.com |
| SES IAM User | havoptic-dev-ses-sender | havoptic-prod-ses-sender |
| DNS Records | DKIM, SPF, Mail From | DKIM, SPF, Mail From |

## Final URLs

**Production:**
- https://havoptic.com
- https://www.havoptic.com

**Development:**
- https://dev.havoptic.com

## Environment Variables

### terraform.tfvars

Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in:

```hcl
cloudflare_api_token  = "your-cloudflare-api-token"
cloudflare_account_id = "your-account-id"
domain                = "havoptic.com"
github_owner          = "scotthavird"
github_repo           = "havoptic.com"
notify_api_key        = "your-notify-api-key"  # Generate with: openssl rand -hex 32
```

### Pages Secrets (Set Automatically by Terraform)

The following secrets are automatically configured on Cloudflare Pages:
- `AWS_ACCESS_KEY_ID` - From IAM user created by Terraform
- `AWS_SECRET_ACCESS_KEY` - From IAM user created by Terraform
- `AWS_REGION` - SES region (us-east-1)
- `NOTIFY_API_KEY` - API key for notification authentication

## Importing Existing Resources

If you've already created the Pages project via wrangler or the dashboard, import it:

```bash
# Get your account ID
npx wrangler whoami

# Import existing Pages project (replace ACCOUNT_ID)
terraform import cloudflare_pages_project.main ACCOUNT_ID/havoptic-prod-web
```

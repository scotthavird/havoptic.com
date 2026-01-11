terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "havoptic-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "havoptic-terraform-locks"
    encrypt        = true
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

# Get zone information
data "cloudflare_zone" "main" {
  name = var.domain
}

locals {
  zone_id     = data.cloudflare_zone.main.id
  environment = "dev"
  app_name    = "havoptic"
  namespace   = "${local.app_name}-${local.environment}"

  web_pages_name = "${local.namespace}-web"
}

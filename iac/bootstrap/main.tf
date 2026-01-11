# Havoptic Terraform State Bootstrap
# This creates the S3 bucket and DynamoDB table for remote state storage.
# Run this once with local state, then migrate prod/dev to use the remote backend.

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # This bootstrap config uses local state (chicken-and-egg problem)
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

variable "aws_region" {
  description = "AWS region for state storage"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "default"
}

locals {
  project_name = "havoptic"
}

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${local.project_name}-terraform-state"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name    = "${local.project_name}-terraform-state"
    Project = local.project_name
    Purpose = "Terraform state storage"
  }
}

# Enable versioning for state recovery
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${local.project_name}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST" # On-demand = no cost when idle
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name    = "${local.project_name}-terraform-locks"
    Project = local.project_name
    Purpose = "Terraform state locking"
  }
}

output "s3_bucket_name" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "backend_config" {
  description = "Backend configuration to add to prod/dev"
  value       = <<-EOT

    Add this to your terraform {} block in prod/main.tf and dev/main.tf:

    backend "s3" {
      bucket         = "${aws_s3_bucket.terraform_state.id}"
      key            = "ENV/terraform.tfstate"  # Replace ENV with prod or dev
      region         = "${var.aws_region}"
      dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
      encrypt        = true
    }

  EOT
}

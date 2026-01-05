# Havoptic Email Infrastructure - Production
# AWS SES configuration for newsletter sending

# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain
}

# SES Domain DKIM
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# DNS Records for SES Domain Verification
resource "cloudflare_record" "ses_verification" {
  zone_id         = data.cloudflare_zone.main.id
  name            = "_amazonses.${var.domain}"
  type            = "TXT"
  content         = aws_ses_domain_identity.main.verification_token
  comment         = "SES domain verification for ${local.namespace}"
  allow_overwrite = true
}

# DNS Records for DKIM
resource "cloudflare_record" "ses_dkim" {
  count           = 3
  zone_id         = data.cloudflare_zone.main.id
  name            = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain}"
  type            = "CNAME"
  content         = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"
  comment         = "DKIM record ${count.index + 1} for ${local.namespace}"
  allow_overwrite = true
}

# Mail From Domain (optional but recommended for better deliverability)
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.domain}"
}

# DNS Records for Mail From
resource "cloudflare_record" "ses_mail_from_mx" {
  zone_id         = data.cloudflare_zone.main.id
  name            = "mail"
  type            = "MX"
  content         = "feedback-smtp.${var.aws_region}.amazonses.com"
  priority        = 10
  comment         = "SES Mail From MX record for ${local.namespace}"
  allow_overwrite = true
}

resource "cloudflare_record" "ses_mail_from_txt" {
  zone_id         = data.cloudflare_zone.main.id
  name            = "mail"
  type            = "TXT"
  content         = "v=spf1 include:amazonses.com ~all"
  comment         = "SES Mail From SPF record for ${local.namespace}"
  allow_overwrite = true
}

# IAM User for SES sending (used by Cloudflare Function)
resource "aws_iam_user" "ses_sender" {
  name = "${local.namespace}-ses-sender"
  tags = {
    Environment = local.environment
    Purpose     = "Newsletter sending via SES"
  }
}

resource "aws_iam_user_policy" "ses_send" {
  name = "${local.namespace}-ses-send-policy"
  user = aws_iam_user.ses_sender.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.newsletter_from_email
          }
        }
      }
    ]
  })
}

resource "aws_iam_access_key" "ses_sender" {
  user = aws_iam_user.ses_sender.name
}

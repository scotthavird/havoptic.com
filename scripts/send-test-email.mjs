#!/usr/bin/env node
/**
 * Send test email via AWS SES
 * Uses default AWS credentials from ~/.aws/credentials
 *
 * Usage: node scripts/send-test-email.mjs <email-address> [num-releases]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tool brand colors for email styling
const TOOL_COLORS = {
  'claude-code': '#D97706',
  'openai-codex': '#059669',
  'cursor': '#7C3AED',
  'gemini-cli': '#00ACC1',
  'kiro': '#8B5CF6',
  'github-copilot': '#8534F3',
  'windsurf': '#00D4AA',
};

// Normalize version string to always have single 'v' prefix
const normalizeVersion = (v) => {
  if (!v) return 'v0.0.0';
  const cleaned = v.replace(/^v+/, '');
  return `v${cleaned}`;
};

// Generate email content for new releases with infographics
function generateEmailContent(releases) {
  const releaseCount = releases.length;

  const subject = releaseCount === 1
    ? `New: ${releases[0].toolDisplayName} ${normalizeVersion(releases[0].version)} Just Shipped`
    : `${releaseCount} AI Tool Updates You Need to See`;

  const releaseCards = releases.map(r => {
    const toolColor = TOOL_COLORS[r.tool] || '#D97706';
    const hasInfographic = !!r.infographicUrl;
    const infographicSrc = hasInfographic
      ? `https://havoptic.com${r.infographicUrl}`
      : null;
    const version = normalizeVersion(r.version);

    const releaseDate = new Date(r.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Link to havoptic.com release page (drives traffic to our site)
    const releasePageUrl = `https://havoptic.com/r/${r.id}`;

    return {
      html: `
        <!-- Release Card -->
        <tr>
          <td style="padding: 0 0 24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <tr>
                <!-- Left Border Accent -->
                <td width="4" style="background-color: ${toolColor}; width: 4px;"></td>
                <td style="background-color: #ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <!-- Card Header with Tool Badge -->
                    <tr>
                      <td style="padding: 20px 24px 12px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <span style="display: inline-block; background-color: ${toolColor}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${r.toolDisplayName}
                              </span>
                            </td>
                            <td style="text-align: right;">
                              <span style="color: #64748b; font-size: 13px; font-weight: 500;">${releaseDate}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Version -->
                    <tr>
                      <td style="padding: 0 24px 16px;">
                        <h2 style="margin: 0; font-size: 32px; font-weight: 800; color: #0f172a; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
                          ${version}
                        </h2>
                      </td>
                    </tr>

                    ${hasInfographic ? `
                    <!-- Infographic Image -->
                    <tr>
                      <td style="padding: 0 24px 20px;">
                        <a href="${releasePageUrl}" target="_blank" style="display: block;">
                          <img
                            src="${infographicSrc}"
                            alt="${r.toolDisplayName} ${version} release highlights"
                            width="500"
                            style="width: 100%; max-width: 500px; height: auto; border-radius: 8px; display: block; border: 1px solid #e2e8f0;"
                          />
                        </a>
                      </td>
                    </tr>
                    ` : `
                    <!-- Summary (fallback when no infographic) -->
                    <tr>
                      <td style="padding: 0 24px 20px;">
                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">
                          ${r.summary}
                        </p>
                      </td>
                    </tr>
                    `}

                    <!-- CTA Button -->
                    <tr>
                      <td style="padding: 0 24px 24px;">
                        <a href="${releasePageUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: ${toolColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                          View on Havoptic &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `,
      text: `
${r.toolDisplayName} ${version}
Released: ${releaseDate}
${hasInfographic ? `Infographic: https://havoptic.com${r.infographicUrl}` : r.summary}
View on Havoptic: ${releasePageUrl}
`,
    };
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 12px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #0f172a;">Havoptic</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">
                Release Intelligence
              </p>
            </td>
          </tr>
          <!-- Amber accent bar -->
          <tr>
            <td style="padding-bottom: 40px; text-align: center;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="width: 60px; height: 3px; background-color: #d97706; border-radius: 2px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro Section -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a;">
                      ${releaseCount === 1 ? 'Fresh Off the Wire' : `${releaseCount} Updates Just Dropped`}
                    </h2>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #475569;">
                      ${releaseCount === 1
                        ? `${releases[0].toolDisplayName} just shipped a new version. Here's what you need to know.`
                        : `Your favorite AI coding tools have been busy. Here's everything that shipped.`
                      }
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Release Cards -->
          ${releaseCards.map(r => r.html).join('')}

          <!-- View All CTA -->
          <tr>
            <td style="padding: 16px 0 40px; text-align: center;">
              <a href="https://havoptic.com" style="display: inline-block; padding: 16px 40px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                View Complete Timeline &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">
                      You're receiving this because you subscribed to Havoptic release notifications.
                    </p>
                    <p style="margin: 0; font-size: 13px;">
                      <a href="https://havoptic.com/unsubscribe?email={{email}}" style="color: #d97706; text-decoration: underline; font-weight: 500;">Unsubscribe</a>
                      <span style="color: #cbd5e1; padding: 0 12px;">|</span>
                      <a href="https://havoptic.com" style="color: #d97706; text-decoration: underline; font-weight: 500;">Visit Havoptic</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textBody = `
HAVOPTIC - Release Intelligence

${releaseCount === 1 ? 'Fresh Off the Wire' : `${releaseCount} Updates Just Dropped`}

${releaseCount === 1
  ? `${releases[0].toolDisplayName} just shipped a new version. Here's what you need to know.`
  : `Your favorite AI coding tools have been busy. Here's everything that shipped.`
}

---

${releaseCards.map(r => r.text).join('\n---\n')}

---

View Complete Timeline: https://havoptic.com

---
You're receiving this because you subscribed to Havoptic release notifications.
Unsubscribe: https://havoptic.com/unsubscribe?email={{email}}
  `.trim();

  return { subject, htmlBody, textBody };
}

// Main
const toEmail = process.argv[2];
const releaseCount = parseInt(process.argv[3] || '2', 10);

if (!toEmail) {
  console.error('Usage: node scripts/send-test-email.mjs <email-address> [num-releases]');
  console.error('  num-releases: Number of releases to include (default: 2, max: 5)');
  process.exit(1);
}

// Load real releases from releases.json
const releasesPath = join(__dirname, '..', 'public', 'data', 'releases.json');
const releasesData = JSON.parse(readFileSync(releasesPath, 'utf-8'));

// Get recent releases with infographics (prioritize variety of tools)
const releasesWithInfographics = releasesData.releases
  .filter(r => r.infographicUrl)
  .slice(0, 20);

// Pick diverse releases (different tools if possible)
const seenTools = new Set();
const testReleases = [];
for (const r of releasesWithInfographics) {
  if (!seenTools.has(r.tool) && testReleases.length < Math.min(releaseCount, 5)) {
    testReleases.push(r);
    seenTools.add(r.tool);
  }
}

// Fill remaining slots if needed
if (testReleases.length < releaseCount) {
  for (const r of releasesWithInfographics) {
    if (!testReleases.includes(r) && testReleases.length < Math.min(releaseCount, 5)) {
      testReleases.push(r);
    }
  }
}

console.log(`Using ${testReleases.length} real releases:`)
testReleases.forEach(r => console.log(`  - ${r.toolDisplayName} ${r.version}`));

const { subject, htmlBody, textBody } = generateEmailContent(testReleases);

// Replace email placeholder
const personalizedHtml = htmlBody.replace(/\{\{email\}\}/g, encodeURIComponent(toEmail));
const personalizedText = textBody.replace(/\{\{email\}\}/g, encodeURIComponent(toEmail));

console.log(`Sending test email to: ${toEmail}`);
console.log(`Subject: ${subject}`);

// Create email payload for AWS SES
const emailPayload = {
  FromEmailAddress: 'Havoptic <newsletter@havoptic.com>',
  Destination: {
    ToAddresses: [toEmail],
  },
  Content: {
    Simple: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: personalizedHtml,
          Charset: 'UTF-8',
        },
        Text: {
          Data: personalizedText,
          Charset: 'UTF-8',
        },
      },
    },
  },
};

// Write payload to temp file for AWS CLI
const tempFile = join(tmpdir(), `ses-email-${Date.now()}.json`);
writeFileSync(tempFile, JSON.stringify(emailPayload, null, 2));

try {
  const result = execSync(
    `aws sesv2 send-email --cli-input-json file://${tempFile} --region us-east-1`,
    { encoding: 'utf-8' }
  );
  console.log('Email sent successfully!');
  console.log(result);
} catch (error) {
  console.error('Failed to send email:', error.message);
  if (error.stderr) console.error(error.stderr);
  process.exit(1);
} finally {
  unlinkSync(tempFile);
}

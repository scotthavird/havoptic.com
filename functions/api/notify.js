/**
 * Newsletter Notification API
 * POST /api/notify
 *
 * Sends email notifications to subscribers about new releases.
 * Requires authentication via API key.
 *
 * Environment bindings:
 * - AUTH_DB: D1 database for subscriber data
 * - AWS_ACCESS_KEY_ID: AWS SES credentials
 * - AWS_SECRET_ACCESS_KEY: AWS SES credentials
 * - AWS_REGION: AWS region (default: us-east-1)
 * - NOTIFY_API_KEY: Secret key to authenticate requests
 */

import {
  corsHeaders,
  checkRateLimit,
  getAllSubscribers,
  getSubscribersForNotification,
  sendEmail,
} from './_newsletter-utils.js';

// Tool brand colors for email styling
const TOOL_COLORS = {
  'claude-code': '#D97706',
  'openai-codex': '#059669',
  'cursor': '#7C3AED',
  'gemini-cli': '#00ACC1',
  'kiro': '#8B5CF6',
  'github-copilot': '#8534F3',
  'aider': '#22c55e',
  'windsurf': '#00D4AA',
};

// Tool display names
const TOOL_DISPLAY_NAMES = {
  'claude-code': 'Claude Code',
  'openai-codex': 'Codex CLI',
  'cursor': 'Cursor',
  'gemini-cli': 'Gemini CLI',
  'kiro': 'Kiro',
  'github-copilot': 'GitHub Copilot',
  'aider': 'Aider',
  'windsurf': 'Windsurf',
};

// Normalize version string to always have single 'v' prefix
const normalizeVersion = (v) => {
  if (!v) return 'v0.0.0';
  const cleaned = v.replace(/^v+/, '');
  return `v${cleaned}`;
};

// Generate email content for new releases (teaser with CTA to drive site traffic)
function generateEmailContent(releases) {
  const releaseCount = releases.length;

  // More engaging subject lines
  const subject = releaseCount === 1
    ? `New: ${releases[0].toolDisplayName} ${normalizeVersion(releases[0].version)} Just Shipped`
    : `${releaseCount} AI Tool Updates You Need to See`;

  // Build release cards with summary text and CTA
  const releaseCards = releases.map(r => {
    const toolColor = TOOL_COLORS[r.tool] || '#D97706';
    const version = normalizeVersion(r.version);

    // Format the date
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

                    <!-- Summary -->
                    <tr>
                      <td style="padding: 0 24px 20px;">
                        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">
                          ${r.summary}
                        </p>
                      </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                      <td style="padding: 0 24px 24px;">
                        <a href="${releasePageUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: ${toolColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                          View Infographic &rarr;
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
${r.summary}
View Infographic: ${releasePageUrl}
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

// Generate email content for blog posts (weekly digest, monthly comparison)
function generateBlogEmailContent(post) {
  const isWeeklyDigest = post.type === 'weekly-digest';
  const isMonthlyComparison = post.type === 'monthly-comparison';

  // Subject line
  const subject = isWeeklyDigest
    ? `This Week in AI Coding Tools: ${post.title.replace(/^Week \d+ AI Coding Tools: /, '')}`
    : `New Analysis: ${post.title}`;

  // Generate tool badges
  const toolBadges = (post.tools || []).map(toolId => {
    const color = TOOL_COLORS[toolId] || '#D97706';
    const name = TOOL_DISPLAY_NAMES[toolId] || toolId;
    return {
      html: `<span style="display: inline-block; background-color: ${color}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 16px; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 6px; margin-bottom: 6px;">${name}</span>`,
      text: name,
    };
  });

  // Format publish date
  const publishDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Build post URL
  const postUrl = `https://havoptic.com/blog/${post.slug}`;

  // Extract key metrics if available
  const metricsHtml = post.metrics ? `
    <tr>
      <td style="padding: 0 24px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 16px; text-align: center; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: 800; color: #d97706;">${post.metrics.totalReleases || 0}</div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Releases</div>
            </td>
            <td style="padding: 16px; text-align: center; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: 800; color: #059669;">${Object.keys(post.metrics.releasesByTool || {}).length}</div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Tools Active</div>
            </td>
            <td style="padding: 16px; text-align: center;">
              <div style="font-size: 28px; font-weight: 800; color: ${(post.metrics.velocityChange || 0) >= 0 ? '#059669' : '#dc2626'};">${(post.metrics.velocityChange || 0) >= 0 ? '+' : ''}${post.metrics.velocityChange || 0}%</div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Velocity</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  const metricsText = post.metrics
    ? `Stats: ${post.metrics.totalReleases || 0} releases | ${Object.keys(post.metrics.releasesByTool || {}).length} tools active | ${(post.metrics.velocityChange || 0) >= 0 ? '+' : ''}${post.metrics.velocityChange || 0}% velocity`
    : '';

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
                ${isWeeklyDigest ? 'Weekly Digest' : 'Analysis'}
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

          <!-- Main Content Card -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <!-- Left Border Accent -->
                  <td width="4" style="background-color: #d97706; width: 4px;"></td>
                  <td style="background-color: #ffffff;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <!-- Card Header with Date -->
                      <tr>
                        <td style="padding: 20px 24px 16px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <span style="display: inline-block; background-color: #d97706; color: #ffffff; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                                  ${isWeeklyDigest ? 'Weekly Digest' : 'Monthly Comparison'}
                                </span>
                              </td>
                              <td style="text-align: right;">
                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">${publishDate}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Title -->
                      <tr>
                        <td style="padding: 0 24px 16px;">
                          <h2 style="margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                            ${post.title}
                          </h2>
                        </td>
                      </tr>

                      <!-- Tool Badges -->
                      ${toolBadges.length > 0 ? `
                      <tr>
                        <td style="padding: 0 24px 16px;">
                          ${toolBadges.map(b => b.html).join('')}
                        </td>
                      </tr>
                      ` : ''}

                      <!-- Metrics -->
                      ${metricsHtml}

                      <!-- Summary -->
                      <tr>
                        <td style="padding: 0 24px 20px;">
                          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #475569;">
                            ${post.summary}
                          </p>
                        </td>
                      </tr>

                      <!-- CTA Button -->
                      <tr>
                        <td style="padding: 0 24px 24px;">
                          <a href="${postUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 15px;">
                            Read Full Post &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- View Timeline CTA -->
          <tr>
            <td style="padding: 16px 0 40px; text-align: center;">
              <a href="https://havoptic.com" style="display: inline-block; padding: 12px 32px; background-color: transparent; color: #d97706; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; border: 2px solid #d97706;">
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
                      You're receiving this because you subscribed to Havoptic notifications.
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
HAVOPTIC - ${isWeeklyDigest ? 'Weekly Digest' : 'Analysis'}

${post.title}
Published: ${publishDate}

${toolBadges.length > 0 ? `Tools: ${toolBadges.map(b => b.text).join(', ')}` : ''}

${metricsText}

${post.summary}

Read the full post: ${postUrl}

---

View Complete Timeline: https://havoptic.com

---
You're receiving this because you subscribed to Havoptic notifications.
Unsubscribe: https://havoptic.com/unsubscribe?email={{email}}
  `.trim();

  return { subject, htmlBody, textBody };
}

/**
 * POST /api/notify
 * Body: { releases: [...], apiKey: "..." } OR { blogPost: {...}, apiKey: "..." }
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Rate limiting check
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(env.AUTH_DB, clientIP, 'notify', 10);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
            ...corsHeaders,
          },
        }
      );
    }

    const body = await request.json();
    const { releases, blogPost, apiKey } = body;

    // Authenticate request
    if (!apiKey || apiKey !== env.NOTIFY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate payload - must have either releases or blogPost
    const hasReleases = releases && Array.isArray(releases) && releases.length > 0;
    const hasBlogPost = blogPost && blogPost.id && blogPost.title;

    if (!hasReleases && !hasBlogPost) {
      return new Response(
        JSON.stringify({ error: 'No releases or blogPost provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check for required environment variables
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      return new Response(
        JSON.stringify({ error: 'AWS credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Determine content type and tools for preference filtering
    let contentType;
    let toolIds = [];

    if (hasBlogPost) {
      // Map blog post type to content preference type
      contentType = blogPost.type; // 'weekly-digest' or 'monthly-comparison'
      toolIds = blogPost.tools || [];
    } else {
      // Release notifications
      contentType = 'release';
      toolIds = [...new Set(releases.map(r => r.tool))];
    }

    // Get subscribers filtered by preferences (opt-out model)
    // Returns subscribers who haven't disabled this content type AND at least one of the tools
    const subscribers = await getSubscribersForNotification(env.AUTH_DB, toolIds, contentType);

    if (subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscribers to notify (all opted out)', sent: 0, contentType, toolIds }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Generate email content based on payload type
    const { subject, htmlBody, textBody } = hasBlogPost
      ? generateBlogEmailContent(blogPost)
      : generateEmailContent(releases);

    // Send emails to all subscribers
    const results = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const subscriber of subscribers) {
      try {
        // Replace email placeholder in unsubscribe link
        const personalizedHtml = htmlBody.replace(/\{\{email\}\}/g, encodeURIComponent(subscriber.email));
        const personalizedText = textBody.replace(/\{\{email\}\}/g, encodeURIComponent(subscriber.email));

        await sendEmail(subscriber.email, subject, personalizedHtml, personalizedText, env);
        results.sent++;

        // Small delay to respect SES rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error.message);
        results.failed++;
        results.errors.push({ email: subscriber.email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${results.sent} notifications`,
        ...results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Notify error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

/**
 * Handle OPTIONS for CORS preflight
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Export for testing
export { generateEmailContent, generateBlogEmailContent, TOOL_COLORS, TOOL_DISPLAY_NAMES };

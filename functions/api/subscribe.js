/**
 * Newsletter Subscribe API
 * POST /api/subscribe
 *
 * Handles newsletter subscription requests.
 * Stores subscribers in D1 database and validates email format.
 * Sends welcome email via AWS SES.
 */

import {
  EMAIL_REGEX,
  corsHeaders,
  checkRateLimit,
  logAuditEvent,
  getSubscriber,
  getSubscriberCount,
  sendEmail,
} from './_newsletter-utils.js';

// Admin notification email (set via environment variable)
const getAdminEmail = (env) => env.ADMIN_EMAIL || null;

// Generate welcome email content
function generateWelcomeEmailContent() {
  const subject = 'Welcome to Havoptic - Your AI Tool Release Tracker';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Logo/Header -->
          <tr>
            <td style="padding-bottom: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #f8fafc;">Havoptic</h1>
              <p style="margin: 8px 0 0; font-size: 16px; color: #d97706; letter-spacing: 1px; text-transform: uppercase;">AI Tool Release Intelligence</p>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 32px; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155;">
              <h2 style="margin: 0 0 16px; font-size: 24px; color: #f8fafc;">You're In!</h2>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Thanks for joining the Havoptic community. You've just given yourself a competitive edge in the AI coding tools space.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #cbd5e1;">
                From now on, you'll be among the first to know when these tools ship new features:
              </p>

              <!-- Tool List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 12px; height: 12px; background-color: #D97706; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #f8fafc; font-size: 15px;">Claude Code</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 12px; height: 12px; background-color: #059669; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #f8fafc; font-size: 15px;">OpenAI Codex CLI</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 12px; height: 12px; background-color: #7C3AED; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #f8fafc; font-size: 15px;">Cursor</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 12px; height: 12px; background-color: #00ACC1; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #f8fafc; font-size: 15px;">Gemini CLI</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 12px; height: 12px; background-color: #8B5CF6; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #f8fafc; font-size: 15px;">Kiro CLI</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Each notification includes visual infographics highlighting the key features, so you can quickly assess what matters to you.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 32px 0; text-align: center;">
              <a href="https://havoptic.com" style="display: inline-block; padding: 14px 32px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Explore the Timeline
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
                Stay ahead. Ship faster.
              </p>
              <p style="margin: 0; font-size: 12px; color: #475569;">
                <a href="https://havoptic.com/unsubscribe?email={{email}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a>
              </p>
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
HAVOPTIC - AI Tool Release Intelligence

You're In!

Thanks for joining the Havoptic community. You've just given yourself a competitive edge in the AI coding tools space.

From now on, you'll be among the first to know when these tools ship new features:

- Claude Code
- OpenAI Codex CLI
- Cursor
- Gemini CLI
- Kiro CLI

Each notification includes visual infographics highlighting the key features, so you can quickly assess what matters to you.

Explore the Timeline: https://havoptic.com

---
Stay ahead. Ship faster.
Unsubscribe: https://havoptic.com/unsubscribe?email={{email}}
  `.trim();

  return { subject, htmlBody, textBody };
}

// Generate admin notification email for new subscriber
function generateAdminSubscribeNotification(subscriberEmail, totalSubscribers) {
  const subject = `[Havoptic] New subscriber: ${subscriberEmail}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; padding: 24px; border: 1px solid #334155;">
    <h2 style="margin: 0 0 16px; color: #22c55e; font-size: 18px;">New Subscriber</h2>
    <p style="margin: 0 0 12px; color: #e2e8f0; font-size: 15px;">
      <strong>Email:</strong> ${subscriberEmail}
    </p>
    <p style="margin: 0 0 12px; color: #94a3b8; font-size: 14px;">
      <strong>Time:</strong> ${new Date().toISOString()}
    </p>
    <p style="margin: 0; color: #64748b; font-size: 13px;">
      Total subscribers: ${totalSubscribers}
    </p>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
New Havoptic subscriber!

Email: ${subscriberEmail}
Time: ${new Date().toISOString()}
Total subscribers: ${totalSubscribers}
  `.trim();

  return { subject, htmlBody, textBody };
}

/**
 * @param {Request} request
 * @param {Object} env
 * @param {D1Database} env.AUTH_DB
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Rate limiting check
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(env.AUTH_DB, clientIP, 'subscribe', 5);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }),
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

    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if already subscribed
    const existingSubscriber = await getSubscriber(env.AUTH_DB, normalizedEmail);
    if (existingSubscriber) {
      return new Response(
        JSON.stringify({ message: 'Already subscribed', alreadySubscribed: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Add new subscriber to D1
    const subscriberId = crypto.randomUUID();
    const subscribedAt = new Date().toISOString();

    await env.AUTH_DB.prepare(`
      INSERT INTO subscribers (id, email, subscribed_at, source)
      VALUES (?, ?, ?, 'website')
    `).bind(subscriberId, normalizedEmail, subscribedAt).run();

    // Log to audit trail
    await logAuditEvent(env.AUTH_DB, {
      action: 'subscribe',
      email: normalizedEmail,
      timestamp: subscribedAt,
      source: 'website',
      ipAddress: clientIP,
      userAgent: request.headers.get('User-Agent'),
    });

    // Get total subscriber count for admin notification
    const totalSubscribers = await getSubscriberCount(env.AUTH_DB);

    // Send welcome email (don't fail subscription if email fails)
    try {
      if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        const { subject, htmlBody, textBody } = generateWelcomeEmailContent();
        const personalizedHtml = htmlBody.replace(/\{\{email\}\}/g, encodeURIComponent(normalizedEmail));
        const personalizedText = textBody.replace(/\{\{email\}\}/g, encodeURIComponent(normalizedEmail));
        await sendEmail(normalizedEmail, subject, personalizedHtml, personalizedText, env);
      }
    } catch (emailError) {
      console.error('Welcome email failed:', emailError.message);
    }

    // Send admin notification (don't fail subscription if this fails)
    try {
      const adminEmail = getAdminEmail(env);
      if (adminEmail && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        const { subject, htmlBody, textBody } = generateAdminSubscribeNotification(
          normalizedEmail,
          totalSubscribers
        );
        await sendEmail(adminEmail, subject, htmlBody, textBody, env);
      }
    } catch (adminEmailError) {
      console.error('Admin notification failed:', adminEmailError.message);
    }

    return new Response(
      JSON.stringify({ message: 'Successfully subscribed', success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Subscribe error:', error);
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
export { generateWelcomeEmailContent };

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
  generateConfirmationToken,
  TOKEN_EXPIRY_MS,
} from './_newsletter-utils.js';
import { parseSessionCookie, getUserFromSession } from './auth/_utils.js';

// Admin notification email (set via environment variable)
const getAdminEmail = (env) => env.ADMIN_EMAIL || null;

// Generate confirmation email content
function generateConfirmationEmailContent(confirmUrl) {
  const subject = "Confirm your Havoptic subscription";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Please confirm your email to start receiving AI coding tool release notifications.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 8px;">📬</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">One more step...</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #c4b5fd; font-weight: 500;">Confirm your email to get started</p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #334155;">
                You requested to subscribe to Havoptic's AI coding tool release notifications. Click the button below to confirm your email address.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${confirmUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      Confirm my subscription
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 14px; color: #64748b; text-align: center;">
                This link expires in 24 hours.
              </p>

              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
                  If you didn't request this, you can safely ignore this email. You won't receive any notifications without confirming.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Havoptic · AI Coding Tool Release Tracker
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
CONFIRM YOUR HAVOPTIC SUBSCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You requested to subscribe to Havoptic's AI coding tool release notifications.

Click the link below to confirm your email address:

${confirmUrl}

This link expires in 24 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you didn't request this, you can safely ignore this email.
You won't receive any notifications without confirming.

Havoptic · AI Coding Tool Release Tracker
  `.trim();

  return { subject, htmlBody, textBody };
}

// Generate welcome email content (sent after confirmation)
function generateWelcomeEmailContent() {
  const subject = "You're In! Welcome to Havoptic";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden but shows in email preview) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Welcome to Havoptic! You're now tracking AI coding tool releases from Claude Code, Cursor, Gemini CLI, and more.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- Header with gradient background -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
              <!-- Decorative sparkles -->
              <div style="font-size: 24px; margin-bottom: 8px;">✨</div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">You're In!</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #c4b5fd; font-weight: 500;">Welcome to the Havoptic community</p>
            </td>
          </tr>

          <!-- Main content card -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #334155;">
                You've just unlocked early access to AI coding tool updates. When Claude Code, Cursor, or any tool ships something new, you'll know before most developers do.
              </p>

              <!-- What you'll get section -->
              <div style="background: linear-gradient(135deg, #faf5ff 0%, #f0f9ff 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e9d5ff;">
                <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #6b21a8; text-transform: uppercase; letter-spacing: 0.5px;">What You'll Receive</h3>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 28px; height: 28px; background-color: #f0abfc; border-radius: 6px; text-align: center; vertical-align: middle;">
                            <span style="font-size: 14px;">🚀</span>
                          </td>
                          <td style="padding-left: 12px; color: #1e293b; font-size: 14px; font-weight: 500;">Instant release alerts</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 28px; height: 28px; background-color: #a5b4fc; border-radius: 6px; text-align: center; vertical-align: middle;">
                            <span style="font-size: 14px;">📊</span>
                          </td>
                          <td style="padding-left: 12px; color: #1e293b; font-size: 14px; font-weight: 500;">Visual feature infographics</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 28px; height: 28px; background-color: #86efac; border-radius: 6px; text-align: center; vertical-align: middle;">
                            <span style="font-size: 14px;">⚡</span>
                          </td>
                          <td style="padding-left: 12px; color: #1e293b; font-size: 14px; font-weight: 500;">Quick feature summaries</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Tools you're tracking -->
              <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Tools You're Tracking</h3>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #fffbeb; border-radius: 8px; margin-bottom: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 10px; height: 10px; background-color: #D97706; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #92400e; font-size: 14px; font-weight: 600;">Claude Code</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #ecfdf5; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 10px; height: 10px; background-color: #059669; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #065f46; font-size: 14px; font-weight: 600;">OpenAI Codex CLI</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #f5f3ff; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 10px; height: 10px; background-color: #7C3AED; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #5b21b6; font-size: 14px; font-weight: 600;">Cursor</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #ecfeff; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 10px; height: 10px; background-color: #00ACC1; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #0e7490; font-size: 14px; font-weight: 600;">Gemini CLI</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #faf5ff; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 10px; height: 10px; background-color: #8B5CF6; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #6b21a8; font-size: 14px; font-weight: 600;">Kiro CLI</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #faf5ff; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 10px; height: 10px; background-color: #8534F3; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #6b21a8; font-size: 14px; font-weight: 600;">GitHub Copilot CLI</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #ecfdf5; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 10px; height: 10px; background-color: #00D4AA; border-radius: 50%;"></td>
                        <td style="padding-left: 12px; color: #065f46; font-size: 14px; font-weight: 600;">Windsurf</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Section -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 32px 32px; text-align: center; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-radius: 0 0 16px 16px;">
              <a href="https://havoptic.com" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                Explore the Timeline →
              </a>
              <p style="margin: 16px 0 0; font-size: 13px; color: #94a3b8;">
                See what's shipping across all AI coding tools
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #64748b; font-weight: 500;">
                Stay ahead. Ship faster.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                <a href="https://havoptic.com/unsubscribe?email={{email}}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a> · <a href="https://havoptic.com/preferences?email={{email}}" style="color: #94a3b8; text-decoration: underline;">Manage preferences</a>
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
✨ YOU'RE IN! Welcome to Havoptic

You've just unlocked early access to AI coding tool updates. When Claude Code, Cursor, or any tool ships something new, you'll know before most developers do.

WHAT YOU'LL RECEIVE:
━━━━━━━━━━━━━━━━━━━
🚀 Instant release alerts
📊 Visual feature infographics
⚡ Quick feature summaries

TOOLS YOU'RE TRACKING:
━━━━━━━━━━━━━━━━━━━━
• Claude Code
• OpenAI Codex CLI
• Cursor
• Gemini CLI
• Kiro CLI
• GitHub Copilot CLI
• Windsurf

➡️  Explore the Timeline: https://havoptic.com

━━━━━━━━━━━━━━━━━━━
Stay ahead. Ship faster.

Unsubscribe: https://havoptic.com/unsubscribe?email={{email}}
Manage preferences: https://havoptic.com/preferences?email={{email}}
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

    // Check if user is logged in (to link subscription to their account)
    const cookieHeader = request.headers.get('Cookie');
    const sessionToken = parseSessionCookie(cookieHeader);
    let userId = null;
    if (sessionToken) {
      const user = await getUserFromSession(env.AUTH_DB, sessionToken);
      if (user) {
        userId = user.id;
      }
    }

    // Check if already subscribed
    const existingSubscriber = await getSubscriber(env.AUTH_DB, normalizedEmail);
    if (existingSubscriber) {
      // If already confirmed, they're subscribed
      if (existingSubscriber.status === 'confirmed') {
        // If logged in and subscription isn't linked, link it now
        if (userId && !existingSubscriber.user_id) {
          await env.AUTH_DB.prepare(
            'UPDATE subscribers SET user_id = ? WHERE id = ?'
          ).bind(userId, existingSubscriber.id).run();
        }
        return new Response(
          JSON.stringify({ message: 'Already subscribed', alreadySubscribed: true }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // If pending, resend confirmation email
      const token = generateConfirmationToken();
      const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();

      await env.AUTH_DB.prepare(`
        UPDATE subscribers
        SET confirmation_token = ?, token_expires_at = ?
        WHERE id = ?
      `).bind(token, tokenExpiresAt, existingSubscriber.id).run();

      // Send new confirmation email
      try {
        if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
          const confirmUrl = `https://havoptic.com/api/confirm?token=${token}`;
          const { subject, htmlBody, textBody } = generateConfirmationEmailContent(confirmUrl);
          await sendEmail(normalizedEmail, subject, htmlBody, textBody, env);
        }
      } catch (emailError) {
        console.error('Confirmation email failed:', emailError.message);
      }

      return new Response(
        JSON.stringify({
          message: 'Confirmation email sent. Please check your inbox.',
          success: true,
          pending: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Add new subscriber as pending
    const subscriberId = crypto.randomUUID();
    const subscribedAt = new Date().toISOString();
    const token = generateConfirmationToken();
    const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();

    await env.AUTH_DB.prepare(`
      INSERT INTO subscribers (id, email, subscribed_at, source, user_id, status, confirmation_token, token_expires_at)
      VALUES (?, ?, ?, 'website', ?, 'pending', ?, ?)
    `).bind(subscriberId, normalizedEmail, subscribedAt, userId, token, tokenExpiresAt).run();

    // Log to audit trail
    await logAuditEvent(env.AUTH_DB, {
      action: 'subscribe',
      email: normalizedEmail,
      timestamp: subscribedAt,
      source: 'website',
      ipAddress: clientIP,
      userAgent: request.headers.get('User-Agent'),
    });

    // Send confirmation email (don't fail subscription if email fails)
    try {
      if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        const confirmUrl = `https://havoptic.com/api/confirm?token=${token}`;
        const { subject, htmlBody, textBody } = generateConfirmationEmailContent(confirmUrl);
        await sendEmail(normalizedEmail, subject, htmlBody, textBody, env);
      }
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError.message);
    }

    // Send admin notification (don't fail subscription if this fails)
    try {
      const adminEmail = getAdminEmail(env);
      if (adminEmail && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        const totalSubscribers = await getSubscriberCount(env.AUTH_DB);
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
      JSON.stringify({
        message: 'Please check your email to confirm your subscription.',
        success: true,
        pending: true,
      }),
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

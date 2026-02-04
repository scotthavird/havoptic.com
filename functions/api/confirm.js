/**
 * Email Confirmation API
 * GET /api/confirm?token=xxx
 *
 * Verifies email address by validating confirmation token.
 * Marks subscriber as confirmed and sends welcome email.
 */

import {
  corsHeaders,
  logAuditEvent,
  getSubscriberByToken,
  confirmSubscriber,
  isTokenExpired,
  sendEmail,
} from './_newsletter-utils.js';

// Generate welcome email content (same as in subscribe.js)
function generateWelcomeEmailContent(email) {
  const subject = "You're In! Welcome to Havoptic";

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
    Welcome to Havoptic! You're now tracking AI coding tool releases from Claude Code, Cursor, Gemini CLI, and more.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- Header with gradient background -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 8px;">✨</div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">You're In!</h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #c4b5fd; font-weight: 500;">Welcome to the Havoptic community</p>
            </td>
          </tr>

          <!-- Main content card -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #334155;">
                Your email is confirmed! You'll now receive notifications when AI coding tools like Claude Code, Cursor, or Gemini CLI ship new releases.
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

              <!-- Tools tracking -->
              <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Tools You're Tracking</h3>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 8px 12px; background-color: #fffbeb; border-radius: 8px;">
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
                Explore the Timeline
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
                <a href="https://havoptic.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a> · <a href="https://havoptic.com/preferences?email=${encodeURIComponent(email)}" style="color: #94a3b8; text-decoration: underline;">Manage preferences</a>
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
YOU'RE IN! Welcome to Havoptic

Your email is confirmed! You'll now receive notifications when AI coding tools like Claude Code, Cursor, or Gemini CLI ship new releases.

WHAT YOU'LL RECEIVE:
- Instant release alerts
- Visual feature infographics
- Quick feature summaries

TOOLS YOU'RE TRACKING:
- Claude Code
- OpenAI Codex CLI
- Cursor
- Gemini CLI
- Kiro CLI
- GitHub Copilot CLI
- Windsurf

Explore the Timeline: https://havoptic.com

---
Stay ahead. Ship faster.

Unsubscribe: https://havoptic.com/unsubscribe?email=${encodeURIComponent(email)}
Manage preferences: https://havoptic.com/preferences?email=${encodeURIComponent(email)}
  `.trim();

  return { subject, htmlBody, textBody };
}

/**
 * @param {Request} request
 * @param {Object} env
 * @param {D1Database} env.AUTH_DB
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.redirect('https://havoptic.com/confirmed?error=missing-token', 302);
    }

    // Look up subscriber by token
    const subscriber = await getSubscriberByToken(env.AUTH_DB, token);

    if (!subscriber) {
      return Response.redirect('https://havoptic.com/confirmed?error=invalid-token', 302);
    }

    // Check if already confirmed
    if (subscriber.status === 'confirmed') {
      return Response.redirect('https://havoptic.com/confirmed?status=already-confirmed', 302);
    }

    // Check if token is expired
    if (isTokenExpired(subscriber.token_expires_at)) {
      return Response.redirect('https://havoptic.com/confirmed?error=expired-token', 302);
    }

    // Confirm the subscriber
    const confirmedAt = await confirmSubscriber(env.AUTH_DB, subscriber.id);

    // Log to audit trail
    await logAuditEvent(env.AUTH_DB, {
      action: 'confirm',
      email: subscriber.email,
      timestamp: confirmedAt,
      source: 'email-verification',
    });

    // Send welcome email
    try {
      if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        const { subject, htmlBody, textBody } = generateWelcomeEmailContent(subscriber.email);
        await sendEmail(subscriber.email, subject, htmlBody, textBody, env);
      }
    } catch (emailError) {
      console.error('Welcome email failed:', emailError.message);
    }

    // Redirect to success page
    return Response.redirect('https://havoptic.com/confirmed?status=success', 302);

  } catch (error) {
    console.error('Confirm error:', error);
    return Response.redirect('https://havoptic.com/confirmed?error=server-error', 302);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Newsletter Unsubscribe API
 * POST /api/unsubscribe
 *
 * Handles newsletter unsubscription requests.
 * Removes subscribers from D1 database.
 * Sends admin notification on unsubscribe.
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

// Generate admin notification email for unsubscribe
function generateAdminUnsubscribeNotification(subscriberEmail, remainingSubscribers) {
  const subject = `[Havoptic] Unsubscribed: ${subscriberEmail}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; padding: 24px; border: 1px solid #334155;">
    <h2 style="margin: 0 0 16px; color: #ef4444; font-size: 18px;">Subscriber Left</h2>
    <p style="margin: 0 0 12px; color: #e2e8f0; font-size: 15px;">
      <strong>Email:</strong> ${subscriberEmail}
    </p>
    <p style="margin: 0 0 12px; color: #94a3b8; font-size: 14px;">
      <strong>Time:</strong> ${new Date().toISOString()}
    </p>
    <p style="margin: 0; color: #64748b; font-size: 13px;">
      Remaining subscribers: ${remainingSubscribers}
    </p>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
Havoptic subscriber left

Email: ${subscriberEmail}
Time: ${new Date().toISOString()}
Remaining subscribers: ${remainingSubscribers}
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
    const rateLimit = await checkRateLimit(env.AUTH_DB, clientIP, 'unsubscribe', 5);
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

    // Check if subscriber exists
    const subscriber = await getSubscriber(env.AUTH_DB, normalizedEmail);
    if (!subscriber) {
      return new Response(
        JSON.stringify({ message: 'Email not found', notFound: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const unsubscribedAt = new Date().toISOString();

    // Remove subscriber from D1
    await env.AUTH_DB.prepare(
      'DELETE FROM subscribers WHERE email = ?'
    ).bind(normalizedEmail).run();

    // Log to audit trail
    await logAuditEvent(env.AUTH_DB, {
      action: 'unsubscribe',
      email: normalizedEmail,
      timestamp: unsubscribedAt,
      originalSubscribedAt: subscriber.subscribed_at,
      ipAddress: clientIP,
      userAgent: request.headers.get('User-Agent'),
    });

    // Get remaining subscriber count for admin notification
    const remainingSubscribers = await getSubscriberCount(env.AUTH_DB);

    // Send admin notification (don't fail unsubscribe if this fails)
    try {
      const adminEmail = getAdminEmail(env);
      if (adminEmail && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        const { subject, htmlBody, textBody } = generateAdminUnsubscribeNotification(
          normalizedEmail,
          remainingSubscribers
        );
        await sendEmail(adminEmail, subject, htmlBody, textBody, env);
      }
    } catch (adminEmailError) {
      console.error('Admin notification failed:', adminEmailError.message);
    }

    return new Response(
      JSON.stringify({ message: 'Successfully unsubscribed', success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Unsubscribe error:', error);
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

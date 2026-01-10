/**
 * Newsletter Subscribe API
 * POST /api/subscribe
 *
 * Handles newsletter subscription requests.
 * Stores subscribers in R2 bucket and validates email format.
 * Sends welcome email via AWS SES.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBSCRIBERS_KEY = 'subscribers.json';
const RATE_LIMIT_KEY = 'rate-limits/subscribe.json';
const FROM_EMAIL = 'newsletter@havoptic.com';
const FROM_NAME = 'Havoptic';

// Rate limiting: 5 requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms
const RATE_LIMIT_MAX = 5;

async function checkRateLimit(ip, env) {
  try {
    const object = await env.NEWSLETTER_BUCKET.get(RATE_LIMIT_KEY);
    let limits = {};
    if (object) {
      limits = JSON.parse(await object.text());
    }

    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Clean old entries and get current count for this IP
    const ipLimits = (limits[ip] || []).filter(ts => ts > windowStart);

    if (ipLimits.length >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0 };
    }

    // Add current request
    ipLimits.push(now);
    limits[ip] = ipLimits;

    // Clean up old IPs (older than 5 minutes)
    const cleanupThreshold = now - 5 * 60 * 1000;
    for (const key of Object.keys(limits)) {
      limits[key] = limits[key].filter(ts => ts > cleanupThreshold);
      if (limits[key].length === 0) {
        delete limits[key];
      }
    }

    // Save updated limits
    await env.NEWSLETTER_BUCKET.put(RATE_LIMIT_KEY, JSON.stringify(limits), {
      httpMetadata: { contentType: 'application/json' },
    });

    return { allowed: true, remaining: RATE_LIMIT_MAX - ipLimits.length };
  } catch (e) {
    console.error('Rate limit check error:', e);
    // Allow request if rate limiting fails
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }
}

// AWS Signature V4 implementation for SES API
async function signRequest(method, url, headers, body, credentials, region, service) {
  const encoder = new TextEncoder();

  async function hmacSha256(key, message) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      typeof key === 'string' ? encoder.encode(key) : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  }

  async function sha256(message) {
    return await crypto.subtle.digest('SHA-256', encoder.encode(message));
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const parsedUrl = new URL(url);
  const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = datetime.slice(0, 8);

  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n';

  const signedHeaders = Object.keys(headers)
    .map(k => k.toLowerCase())
    .sort()
    .join(';');

  const payloadHash = toHex(await sha256(body || ''));

  const canonicalRequest = [
    method,
    parsedUrl.pathname,
    parsedUrl.search.slice(1),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    toHex(await sha256(canonicalRequest)),
  ].join('\n');

  const kDate = await hmacSha256('AWS4' + credentials.secretKey, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  return {
    ...headers,
    'x-amz-date': datetime,
    'x-amz-content-sha256': payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

// Send email via AWS SES API
async function sendEmail(to, subject, htmlBody, textBody, env) {
  const region = env.AWS_REGION || 'us-east-1';
  const endpoint = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;

  const body = JSON.stringify({
    FromEmailAddress: `${FROM_NAME} <${FROM_EMAIL}>`,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    },
  });

  const headers = {
    'Content-Type': 'application/json',
    host: `email.${region}.amazonaws.com`,
  };

  const signedHeaders = await signRequest(
    'POST',
    endpoint,
    headers,
    body,
    {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretKey: env.AWS_SECRET_ACCESS_KEY,
    },
    region,
    'ses'
  );

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: signedHeaders,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SES API error ${response.status}: ${errorText}`);
  }

  return await response.json();
}

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

/**
 * @param {Request} request
 * @param {Object} env
 * @param {R2Bucket} env.NEWSLETTER_BUCKET
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Rate limiting check
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(clientIP, env);
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

    // Get current subscribers from R2
    let subscribers = [];
    try {
      const object = await env.NEWSLETTER_BUCKET.get(SUBSCRIBERS_KEY);
      if (object) {
        const text = await object.text();
        subscribers = JSON.parse(text);
      }
    } catch (e) {
      // File doesn't exist yet or parse error, start fresh
      subscribers = [];
    }

    // Check if already subscribed
    const existingSubscriber = subscribers.find(s => s.email === normalizedEmail);
    if (existingSubscriber) {
      return new Response(
        JSON.stringify({ message: 'Already subscribed', alreadySubscribed: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Add new subscriber
    const newSubscriber = {
      email: normalizedEmail,
      subscribedAt: new Date().toISOString(),
      source: 'website',
    };
    subscribers.push(newSubscriber);

    // Save back to R2
    await env.NEWSLETTER_BUCKET.put(
      SUBSCRIBERS_KEY,
      JSON.stringify(subscribers, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    );

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

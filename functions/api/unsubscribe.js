/**
 * Newsletter Unsubscribe API
 * POST /api/unsubscribe
 *
 * Handles newsletter unsubscription requests.
 * Removes subscribers from R2 bucket.
 * Sends admin notification on unsubscribe.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBSCRIBERS_KEY = 'subscribers.json';
const AUDIT_LOG_KEY = 'newsletter-audit.json';
const RATE_LIMIT_KEY = 'rate-limits/unsubscribe.json';
const FROM_EMAIL = 'newsletter@havoptic.com';
const FROM_NAME = 'Havoptic';

// Admin notification email (set via environment variable)
const getAdminEmail = (env) => env.ADMIN_EMAIL || null;

// Append event to audit log
async function logAuditEvent(env, event) {
  try {
    let auditLog = [];
    const object = await env.NEWSLETTER_BUCKET.get(AUDIT_LOG_KEY);
    if (object) {
      auditLog = JSON.parse(await object.text());
    }
    auditLog.push(event);
    await env.NEWSLETTER_BUCKET.put(
      AUDIT_LOG_KEY,
      JSON.stringify(auditLog, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    );
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

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
      // File doesn't exist yet or parse error
      subscribers = [];
    }

    // Check if subscriber exists
    const subscriberIndex = subscribers.findIndex(s => s.email === normalizedEmail);
    if (subscriberIndex === -1) {
      return new Response(
        JSON.stringify({ message: 'Email not found', notFound: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get subscriber info before removing for audit log
    const subscriber = subscribers[subscriberIndex];
    const unsubscribedAt = new Date().toISOString();

    // Remove subscriber
    subscribers.splice(subscriberIndex, 1);

    // Save back to R2
    await env.NEWSLETTER_BUCKET.put(
      SUBSCRIBERS_KEY,
      JSON.stringify(subscribers, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    );

    // Log to audit trail
    await logAuditEvent(env, {
      action: 'unsubscribe',
      email: normalizedEmail,
      timestamp: unsubscribedAt,
      originalSubscribedAt: subscriber.subscribedAt || null,
    });

    // Send admin notification (don't fail unsubscribe if this fails)
    try {
      const adminEmail = getAdminEmail(env);
      if (adminEmail && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        const { subject, htmlBody, textBody } = generateAdminUnsubscribeNotification(
          normalizedEmail,
          subscribers.length
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

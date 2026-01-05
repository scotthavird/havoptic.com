/**
 * Newsletter Notification API
 * POST /api/notify
 *
 * Sends email notifications to subscribers about new releases.
 * Requires authentication via API key.
 *
 * Environment bindings:
 * - NEWSLETTER_BUCKET: R2 bucket for subscriber data
 * - AWS_ACCESS_KEY_ID: AWS SES credentials
 * - AWS_SECRET_ACCESS_KEY: AWS SES credentials
 * - AWS_REGION: AWS region (default: us-east-1)
 * - NOTIFY_API_KEY: Secret key to authenticate requests
 */

const SUBSCRIBERS_KEY = 'subscribers.json';
const RATE_LIMIT_KEY = 'rate-limits/notify.json';
const FROM_EMAIL = 'newsletter@havoptic.com';
const FROM_NAME = 'Havoptic';

// Rate limiting: 10 requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms
const RATE_LIMIT_MAX = 10;

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

// Generate email content for new releases
function generateEmailContent(releases) {
  const releaseCount = releases.length;
  const toolNames = [...new Set(releases.map(r => r.toolDisplayName))].join(', ');

  const subject = releaseCount === 1
    ? `New Release: ${releases[0].toolDisplayName} ${releases[0].version}`
    : `${releaseCount} New AI Tool Releases`;

  const releaseItems = releases.map(r => {
    return {
      html: `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #334155;">
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">${r.toolDisplayName}</div>
            <div style="font-size: 18px; font-weight: bold; color: #f8fafc; margin-bottom: 8px;">Version ${r.version}</div>
            <div style="font-size: 14px; color: #cbd5e1; margin-bottom: 12px;">${r.summary}</div>
            <a href="${r.url}" style="color: #d97706; text-decoration: none; font-size: 14px;">View Release →</a>
          </td>
        </tr>
      `,
      text: `${r.toolDisplayName} ${r.version}\n${r.summary}\n${r.url}\n`,
    };
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 24px; color: #f8fafc;">Havoptic</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">AI Coding Tool Releases</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 16px; color: #e2e8f0;">
                ${releaseCount === 1 ? 'A new release is available:' : `${releaseCount} new releases are available:`}
              </p>
            </td>
          </tr>

          <!-- Releases -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${releaseItems.map(r => r.html).join('')}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 32px 0;">
              <a href="https://havoptic.com" style="display: inline-block; padding: 12px 24px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                View All Releases
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #334155;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You're receiving this because you subscribed to Havoptic release notifications.
                <br><br>
                <a href="https://havoptic.com/unsubscribe?email={{email}}" style="color: #64748b;">Unsubscribe</a>
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
Havoptic - AI Coding Tool Releases

${releaseCount === 1 ? 'A new release is available:' : `${releaseCount} new releases are available:`}

${releaseItems.map(r => r.text).join('\n')}

View all releases: https://havoptic.com

---
You're receiving this because you subscribed to Havoptic release notifications.
Unsubscribe: https://havoptic.com/unsubscribe?email={{email}}
  `.trim();

  return { subject, htmlBody, textBody };
}

/**
 * POST /api/notify
 * Body: { releases: [...], apiKey: "..." }
 */
export async function onRequestPost(context) {
  const { request, env } = context;

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
    const { releases, apiKey } = body;

    // Authenticate request
    if (!apiKey || apiKey !== env.NOTIFY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate releases
    if (!releases || !Array.isArray(releases) || releases.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No releases provided' }),
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

    // Get subscribers from R2
    let subscribers = [];
    try {
      const object = await env.NEWSLETTER_BUCKET.get(SUBSCRIBERS_KEY);
      if (object) {
        const text = await object.text();
        subscribers = JSON.parse(text);
      }
    } catch (e) {
      console.error('Error reading subscribers:', e);
    }

    if (subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscribers to notify', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Generate email content
    const { subject, htmlBody, textBody } = generateEmailContent(releases);

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

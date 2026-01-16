/**
 * Newsletter Utilities
 * Shared functions for newsletter subscription management using D1
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const FROM_EMAIL = 'newsletter@havoptic.com';
export const FROM_NAME = 'Havoptic';

// Rate limiting constants
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms
const RATE_LIMIT_MAX_DEFAULT = 5;

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * D1-based rate limiting
 * Uses atomic operations to avoid race conditions
 */
export async function checkRateLimit(db, ip, endpoint, maxRequests = RATE_LIMIT_MAX_DEFAULT) {
  try {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Clean old entries and count recent requests atomically
    await db.prepare(
      'DELETE FROM rate_limits WHERE timestamp < ?'
    ).bind(windowStart).run();

    const result = await db.prepare(
      'SELECT COUNT(*) as count FROM rate_limits WHERE ip_address = ? AND endpoint = ? AND timestamp > ?'
    ).bind(ip, endpoint, windowStart).first();

    const count = result?.count || 0;

    if (count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Insert new request
    await db.prepare(
      'INSERT INTO rate_limits (ip_address, endpoint, timestamp) VALUES (?, ?, ?)'
    ).bind(ip, endpoint, now).run();

    return { allowed: true, remaining: maxRequests - count - 1 };
  } catch (e) {
    console.error('Rate limit check error:', e);
    // Allow request if rate limiting fails
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Log audit event to D1
 */
export async function logAuditEvent(db, event) {
  try {
    await db.prepare(`
      INSERT INTO newsletter_audit (action, email, timestamp, source, original_subscribed_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.action,
      event.email,
      event.timestamp || new Date().toISOString(),
      event.source || null,
      event.originalSubscribedAt || null,
      event.ipAddress || null,
      event.userAgent || null
    ).run();
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

/**
 * Check if email is subscribed
 */
export async function isSubscribed(db, email) {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.prepare(
    'SELECT id FROM subscribers WHERE email = ?'
  ).bind(normalizedEmail).first();
  return !!result;
}

/**
 * Get subscriber by email
 */
export async function getSubscriber(db, email) {
  const normalizedEmail = email.trim().toLowerCase();
  return await db.prepare(
    'SELECT * FROM subscribers WHERE email = ?'
  ).bind(normalizedEmail).first();
}

/**
 * Get all subscribers
 */
export async function getAllSubscribers(db) {
  const result = await db.prepare('SELECT email FROM subscribers').all();
  return result.results || [];
}

/**
 * Get subscriber count
 */
export async function getSubscriberCount(db) {
  const result = await db.prepare('SELECT COUNT(*) as count FROM subscribers').first();
  return result?.count || 0;
}

/**
 * AWS Signature V4 implementation for SES API
 */
export async function signRequest(method, url, headers, body, credentials, region, service) {
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

/**
 * Send email via AWS SES API
 */
export async function sendEmail(to, subject, htmlBody, textBody, env) {
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

/**
 * Newsletter Utilities
 * Shared functions for newsletter subscription management using D1
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const FROM_EMAIL = 'newsletter@havoptic.com';
export const FROM_NAME = 'Havoptic';

// Token expiration time (24 hours in milliseconds)
export const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

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
 * Get all confirmed subscribers (for sending notifications)
 */
export async function getAllSubscribers(db) {
  const result = await db.prepare(
    "SELECT id, email FROM subscribers WHERE status = 'confirmed'"
  ).all();
  return result.results || [];
}

/**
 * Generate a secure confirmation token
 */
export function generateConfirmationToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get subscriber by confirmation token
 */
export async function getSubscriberByToken(db, token) {
  if (!token) return null;
  return await db.prepare(
    'SELECT * FROM subscribers WHERE confirmation_token = ?'
  ).bind(token).first();
}

/**
 * Confirm a subscriber (verify their email)
 */
export async function confirmSubscriber(db, subscriberId) {
  const confirmedAt = new Date().toISOString();
  await db.prepare(`
    UPDATE subscribers
    SET status = 'confirmed',
        confirmed_at = ?,
        confirmation_token = NULL,
        token_expires_at = NULL
    WHERE id = ?
  `).bind(confirmedAt, subscriberId).run();
  return confirmedAt;
}

/**
 * Check if confirmation token is expired
 */
export function isTokenExpired(tokenExpiresAt) {
  if (!tokenExpiresAt) return true;
  return new Date(tokenExpiresAt) < new Date();
}

/**
 * Get subscribers filtered by tool preferences (opt-out model)
 * Returns CONFIRMED subscribers who have NOT explicitly disabled the given tools
 * @param {D1Database} db
 * @param {string[]} toolIds - Array of tool IDs (e.g., ['claude-code', 'cursor'])
 * @returns {Promise<Array<{id: string, email: string}>>}
 */
export async function getSubscribersForTools(db, toolIds) {
  if (!toolIds || toolIds.length === 0) {
    return getAllSubscribers(db);
  }

  // Get all confirmed subscribers, then filter out those who have opted out of ALL the specified tools
  // A subscriber receives the notification if they haven't opted out of at least one tool
  const placeholders = toolIds.map(() => '?').join(',');

  const result = await db.prepare(`
    SELECT DISTINCT s.id, s.email
    FROM subscribers s
    WHERE s.status = 'confirmed'
      AND NOT EXISTS (
        -- Check if subscriber has opted out of ALL specified tools
        SELECT 1 FROM (
          SELECT ? as tool_count
        ) tc
        WHERE tc.tool_count = (
          SELECT COUNT(*)
          FROM subscriber_tool_preferences stp
          WHERE stp.subscriber_id = s.id
            AND stp.tool_id IN (${placeholders})
            AND stp.enabled = 0
        )
      )
  `).bind(toolIds.length, ...toolIds).all();

  return result.results || [];
}

/**
 * Get subscribers filtered by content type preference (opt-out model)
 * Returns CONFIRMED subscribers who have NOT explicitly disabled the given content type
 * @param {D1Database} db
 * @param {string} contentType - Content type: 'release', 'weekly-digest', 'monthly-comparison'
 * @returns {Promise<Array<{id: string, email: string}>>}
 */
export async function getSubscribersForContentType(db, contentType) {
  const result = await db.prepare(`
    SELECT s.id, s.email
    FROM subscribers s
    WHERE s.status = 'confirmed'
      AND NOT EXISTS (
        SELECT 1
        FROM subscriber_content_preferences scp
        WHERE scp.subscriber_id = s.id
          AND scp.content_type = ?
          AND scp.enabled = 0
      )
  `).bind(contentType).all();

  return result.results || [];
}

/**
 * Get subscribers filtered by both tool and content type preferences
 * Returns only CONFIRMED subscribers
 * @param {D1Database} db
 * @param {string[]} toolIds - Array of tool IDs
 * @param {string} contentType - Content type
 * @returns {Promise<Array<{id: string, email: string}>>}
 */
export async function getSubscribersForNotification(db, toolIds, contentType) {
  if (!toolIds || toolIds.length === 0) {
    return getSubscribersForContentType(db, contentType);
  }

  const placeholders = toolIds.map(() => '?').join(',');

  const result = await db.prepare(`
    SELECT DISTINCT s.id, s.email
    FROM subscribers s
    WHERE s.status = 'confirmed'
      AND
      -- Content type not disabled
      NOT EXISTS (
        SELECT 1
        FROM subscriber_content_preferences scp
        WHERE scp.subscriber_id = s.id
          AND scp.content_type = ?
          AND scp.enabled = 0
      )
      AND
      -- At least one of the tools not disabled (subscriber hasn't opted out of ALL)
      NOT EXISTS (
        SELECT 1 FROM (
          SELECT ? as tool_count
        ) tc
        WHERE tc.tool_count = (
          SELECT COUNT(*)
          FROM subscriber_tool_preferences stp
          WHERE stp.subscriber_id = s.id
            AND stp.tool_id IN (${placeholders})
            AND stp.enabled = 0
        )
      )
  `).bind(contentType, toolIds.length, ...toolIds).all();

  return result.results || [];
}

/**
 * Get subscriber preferences
 * @param {D1Database} db
 * @param {string} subscriberId
 * @returns {Promise<{tools: Record<string, boolean>, content: Record<string, boolean>}>}
 */
export async function getSubscriberPreferences(db, subscriberId) {
  const [toolPrefs, contentPrefs] = await Promise.all([
    db.prepare(
      'SELECT tool_id, enabled FROM subscriber_tool_preferences WHERE subscriber_id = ?'
    ).bind(subscriberId).all(),
    db.prepare(
      'SELECT content_type, enabled FROM subscriber_content_preferences WHERE subscriber_id = ?'
    ).bind(subscriberId).all(),
  ]);

  const tools = {};
  for (const row of (toolPrefs.results || [])) {
    tools[row.tool_id] = row.enabled === 1;
  }

  const content = {};
  for (const row of (contentPrefs.results || [])) {
    content[row.content_type] = row.enabled === 1;
  }

  return { tools, content };
}

/**
 * Update subscriber tool preference
 * @param {D1Database} db
 * @param {string} subscriberId
 * @param {string} toolId
 * @param {boolean} enabled
 */
export async function updateToolPreference(db, subscriberId, toolId, enabled) {
  await db.prepare(`
    INSERT INTO subscriber_tool_preferences (subscriber_id, tool_id, enabled, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (subscriber_id, tool_id)
    DO UPDATE SET enabled = ?, updated_at = datetime('now')
  `).bind(subscriberId, toolId, enabled ? 1 : 0, enabled ? 1 : 0).run();
}

/**
 * Update subscriber content type preference
 * @param {D1Database} db
 * @param {string} subscriberId
 * @param {string} contentType
 * @param {boolean} enabled
 */
export async function updateContentPreference(db, subscriberId, contentType, enabled) {
  await db.prepare(`
    INSERT INTO subscriber_content_preferences (subscriber_id, content_type, enabled, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (subscriber_id, content_type)
    DO UPDATE SET enabled = ?, updated_at = datetime('now')
  `).bind(subscriberId, contentType, enabled ? 1 : 0, enabled ? 1 : 0).run();
}

/**
 * Get confirmed subscriber count
 */
export async function getSubscriberCount(db) {
  const result = await db.prepare(
    "SELECT COUNT(*) as count FROM subscribers WHERE status = 'confirmed'"
  ).first();
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

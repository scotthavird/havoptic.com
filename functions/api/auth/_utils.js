/**
 * Auth Utilities
 * Shared authentication functions for session management
 */

// Session configuration
export const SESSION_COOKIE_NAME = 'havoptic_session';
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// CORS headers (following existing pattern)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie',
  'Access-Control-Allow-Credentials': 'true',
};

/**
 * Generate a cryptographically secure session token
 */
export async function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a session cookie string
 */
export function createSessionCookie(token, isProduction) {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  const secure = isProduction ? 'Secure; ' : '';
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${secure}Expires=${expires.toUTCString()}`;
}

/**
 * Create a cookie to clear the session
 */
export function createClearSessionCookie(isProduction) {
  const secure = isProduction ? 'Secure; ' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${secure}Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Parse session token from cookie header
 */
export function parseSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Get user from session token
 * Returns user object if valid session exists, null otherwise
 */
export async function getUserFromSession(db, token) {
  if (!token) return null;

  try {
    const result = await db.prepare(`
      SELECT u.id, u.github_id, u.github_username, u.github_avatar_url, u.email, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).bind(token).first();

    return result || null;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
}

/**
 * Check if request is from production domain
 */
export function isProduction(request) {
  const url = new URL(request.url);
  return url.hostname === 'havoptic.com' || url.hostname === 'www.havoptic.com';
}

/**
 * Auto-subscribe user to newsletter on GitHub login
 * Fire and forget - don't block login on subscription failure
 */
export async function autoSubscribeToNewsletter(bucket, email) {
  if (!email || !bucket) return;

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Read existing subscribers
    let subscribers = [];
    try {
      const existing = await bucket.get('subscribers.json');
      if (existing) {
        const text = await existing.text();
        subscribers = JSON.parse(text);
      }
    } catch {
      subscribers = [];
    }

    // Check if already subscribed
    const isAlreadySubscribed = subscribers.some(
      s => s.email.toLowerCase() === normalizedEmail
    );
    if (isAlreadySubscribed) return;

    // Add new subscriber
    subscribers.push({
      email: normalizedEmail,
      subscribedAt: new Date().toISOString(),
      source: 'github',
    });

    // Save back to R2
    await bucket.put('subscribers.json', JSON.stringify(subscribers, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });

    // Log to audit trail
    try {
      let audit = [];
      const existingAudit = await bucket.get('newsletter-audit.json');
      if (existingAudit) {
        audit = JSON.parse(await existingAudit.text());
      }
      audit.push({
        action: 'subscribe',
        email: normalizedEmail,
        timestamp: new Date().toISOString(),
        source: 'github',
      });
      await bucket.put('newsletter-audit.json', JSON.stringify(audit, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });
    } catch {
      // Audit logging is non-critical
    }

    console.log(`Auto-subscribed ${normalizedEmail} via GitHub login`);
  } catch (error) {
    console.error('Error auto-subscribing to newsletter:', error);
    // Don't throw - subscription failure shouldn't block login
  }
}

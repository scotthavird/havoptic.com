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
 * Check if email is subscribed to newsletter
 */
export async function checkIsSubscribed(db, email) {
  if (!email || !db) return false;

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await db.prepare(
      'SELECT id FROM subscribers WHERE email = ?'
    ).bind(normalizedEmail).first();
    return !!result;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Auto-subscribe user to newsletter on GitHub login
 * Fire and forget - don't block login on subscription failure
 */
export async function autoSubscribeToNewsletter(db, email, userId = null) {
  if (!email || !db) return;

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if already subscribed
    const existing = await db.prepare(
      'SELECT id, user_id FROM subscribers WHERE email = ?'
    ).bind(normalizedEmail).first();

    if (existing) {
      // If subscribed but not linked to user, link them now
      if (userId && !existing.user_id) {
        await db.prepare(
          'UPDATE subscribers SET user_id = ? WHERE id = ?'
        ).bind(userId, existing.id).run();
        console.log(`Linked existing subscriber ${normalizedEmail} to user ${userId}`);
      }
      return;
    }

    // Add new subscriber
    const subscriberId = crypto.randomUUID();
    const subscribedAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO subscribers (id, email, subscribed_at, source, user_id)
      VALUES (?, ?, ?, 'github', ?)
    `).bind(subscriberId, normalizedEmail, subscribedAt, userId).run();

    // Log to audit trail
    try {
      await db.prepare(`
        INSERT INTO newsletter_audit (action, email, timestamp, source)
        VALUES ('subscribe', ?, ?, 'github')
      `).bind(normalizedEmail, subscribedAt).run();
    } catch {
      // Audit logging is non-critical
    }

    console.log(`Auto-subscribed ${normalizedEmail} via GitHub login`);
  } catch (error) {
    console.error('Error auto-subscribing to newsletter:', error);
    // Don't throw - subscription failure shouldn't block login
  }
}

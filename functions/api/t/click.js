/**
 * Email Click Tracking Endpoint
 * GET /api/t/click?sid=<send_id>&url=<base64url_destination>&label=<link_label>
 *
 * Decodes the destination URL, validates the hostname, records the click, and 302 redirects.
 * No deduplication — every click is meaningful engagement.
 */

const ALLOWED_HOSTS = new Set(['havoptic.com', 'www.havoptic.com']);
const FALLBACK_URL = 'https://havoptic.com';

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + padding);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sendId = url.searchParams.get('sid');
  const encodedUrl = url.searchParams.get('url');
  const label = url.searchParams.get('label') || null;

  // Decode and validate destination
  let destination = FALLBACK_URL;
  if (encodedUrl) {
    try {
      const decoded = fromBase64Url(encodedUrl);
      const parsed = new URL(decoded);
      if (ALLOWED_HOSTS.has(parsed.hostname)) {
        destination = decoded;
      }
    } catch {
      // Invalid encoding or URL — fall back to homepage
    }
  }

  // Redirect immediately
  const response = Response.redirect(destination, 302);

  if (sendId && env.AUTH_DB) {
    context.waitUntil(recordClick(env.AUTH_DB, sendId, destination, label, request));
  }

  return response;
}

async function recordClick(db, sendId, linkUrl, label, request) {
  try {
    await db.prepare(`
      INSERT INTO email_events (send_id, event_type, link_url, link_label, ip, user_agent, occurred_at)
      VALUES (?, 'click', ?, ?, ?, ?, ?)
    `).bind(
      sendId,
      linkUrl,
      label,
      request.headers.get('CF-Connecting-IP') || null,
      request.headers.get('User-Agent') || null,
      new Date().toISOString()
    ).run();
  } catch (e) {
    console.error('Failed to record click event:', e);
  }
}

/**
 * Admin Tracking Dashboard API
 * GET /api/admin/tracking
 *
 * Returns email tracking stats (sends, opens, clicks) as JSON.
 * Gated by GitHub OAuth session + ADMIN_GITHUB_IDS env var.
 *
 * Environment bindings:
 * - AUTH_DB: D1 database
 * - ADMIN_GITHUB_IDS: Comma-separated list of GitHub user IDs allowed admin access
 */

import { parseSessionCookie, getUserFromSession, corsHeaders } from '../auth/_utils.js';

function isAdmin(user, env) {
  const adminIds = (env.ADMIN_GITHUB_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  return adminIds.includes(String(user.github_id));
}

/**
 * GET /api/admin/tracking
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.AUTH_DB;

  try {
    // Auth: parse session cookie → get user → check admin
    const cookieHeader = request.headers.get('Cookie');
    const token = parseSessionCookie(cookieHeader);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const user = await getUserFromSession(db, token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!isAdmin(user, env)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Run all queries in parallel
    const [summaryResult, byTypeResult, ratesResult, recentResult, topLinksResult] = await Promise.all([
      // Summary stats
      db.prepare(`
        SELECT COUNT(*) as total_sends,
               COUNT(DISTINCT email) as unique_recipients
        FROM email_sends
      `).first(),

      // Sends by message type (last 30 days)
      db.prepare(`
        SELECT message_type, COUNT(*) as count
        FROM email_sends
        WHERE sent_at > datetime('now', '-30 days')
        GROUP BY message_type
      `).all(),

      // Open/click rates (last 30 days)
      db.prepare(`
        SELECT
          s.message_type,
          COUNT(DISTINCT s.id) as sends,
          COUNT(DISTINCT CASE WHEN e.event_type = 'open' THEN s.id END) as opens,
          COUNT(DISTINCT CASE WHEN e.event_type = 'click' THEN s.id END) as clicked_sends,
          COUNT(CASE WHEN e.event_type = 'click' THEN 1 END) as total_clicks
        FROM email_sends s
        LEFT JOIN email_events e ON e.send_id = s.id
        WHERE s.sent_at > datetime('now', '-30 days')
        GROUP BY s.message_type
      `).all(),

      // Recent sends (last 20)
      db.prepare(`
        SELECT s.id, s.email, s.message_type, s.subject, s.sent_at,
          (SELECT COUNT(*) FROM email_events WHERE send_id = s.id AND event_type = 'open') as opens,
          (SELECT COUNT(*) FROM email_events WHERE send_id = s.id AND event_type = 'click') as clicks
        FROM email_sends s
        ORDER BY s.sent_at DESC
        LIMIT 20
      `).all(),

      // Top clicked links (last 30 days)
      db.prepare(`
        SELECT link_label, link_url, COUNT(*) as clicks
        FROM email_events
        WHERE event_type = 'click' AND occurred_at > datetime('now', '-30 days')
        GROUP BY link_label, link_url
        ORDER BY clicks DESC
        LIMIT 10
      `).all(),
    ]);

    return new Response(JSON.stringify({
      summary: summaryResult,
      byType: byTypeResult.results,
      rates: ratesResult.results,
      recentSends: recentResult.results,
      topLinks: topLinksResult.results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Admin tracking error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
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
      'Access-Control-Allow-Headers': 'Content-Type, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

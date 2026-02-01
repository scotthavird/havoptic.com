/**
 * Push Subscribe API
 * POST /api/push/subscribe
 *
 * Registers a Web Push subscription for browser notifications.
 * Syncs with user's watchlist to filter notifications by tool.
 */

import { corsHeaders, checkRateLimit } from '../_newsletter-utils.js';
import { parseSessionCookie, getUserFromSession } from '../auth/_utils.js';
import { upsertPushSubscription, deletePushSubscriptionByEndpoint } from '../_push-utils.js';

/**
 * Get user's watchlist tools
 */
async function getUserWatchlist(db, userId) {
  if (!userId) return null;
  const result = await db.prepare('SELECT tool_id FROM user_tool_watchlist WHERE user_id = ?').bind(userId).all();
  if (!result.results || result.results.length === 0) return null;
  return result.results.map((r) => r.tool_id);
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
    const rateLimit = await checkRateLimit(env.AUTH_DB, clientIP, 'push-subscribe', 10);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
          ...corsHeaders,
        },
      });
    }

    // Parse request body
    const body = await request.json();
    const { subscription, oldEndpoint, toolFilters } = body;

    // Validate subscription
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return new Response(JSON.stringify({ error: 'Invalid subscription data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if user is logged in
    const cookieHeader = request.headers.get('Cookie');
    const sessionToken = parseSessionCookie(cookieHeader);
    let userId = null;
    if (sessionToken) {
      const user = await getUserFromSession(env.AUTH_DB, sessionToken);
      if (user) {
        userId = user.id;
      }
    }

    // If replacing an old subscription (from pushsubscriptionchange event)
    if (oldEndpoint) {
      await deletePushSubscriptionByEndpoint(env.AUTH_DB, oldEndpoint);
    }

    // Determine tool filters
    // Priority: explicit toolFilters > user's watchlist > null (all tools)
    let finalToolFilters = null;
    if (toolFilters && Array.isArray(toolFilters) && toolFilters.length > 0) {
      finalToolFilters = JSON.stringify(toolFilters);
    } else if (userId) {
      const watchlist = await getUserWatchlist(env.AUTH_DB, userId);
      if (watchlist && watchlist.length > 0) {
        finalToolFilters = JSON.stringify(watchlist);
      }
    }

    // Create or update subscription
    const subscriptionId = await upsertPushSubscription(env.AUTH_DB, subscription, userId, finalToolFilters);

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId,
        toolFilters: finalToolFilters ? JSON.parse(finalToolFilters) : null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Push subscribe error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

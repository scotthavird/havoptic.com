/**
 * Push Unsubscribe API
 * POST /api/push/unsubscribe
 *
 * Removes a Web Push subscription from the database.
 */

import { corsHeaders, checkRateLimit } from '../_newsletter-utils.js';
import { deletePushSubscriptionByEndpoint, getPushSubscriptionByEndpoint } from '../_push-utils.js';

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
    const rateLimit = await checkRateLimit(env.AUTH_DB, clientIP, 'push-unsubscribe', 10);
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
    const { endpoint } = body;

    // Validate endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return new Response(JSON.stringify({ error: 'Endpoint is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if subscription exists
    const existing = await getPushSubscriptionByEndpoint(env.AUTH_DB, endpoint);
    if (!existing) {
      return new Response(JSON.stringify({ success: true, message: 'Subscription not found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Delete subscription
    await deletePushSubscriptionByEndpoint(env.AUTH_DB, endpoint);

    return new Response(JSON.stringify({ success: true, message: 'Subscription removed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
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

/**
 * VAPID Public Key API
 * GET /api/push/vapid-public-key
 *
 * Returns the VAPID public key needed for subscribing to push notifications.
 */

import { corsHeaders } from '../_newsletter-utils.js';

/**
 * @param {Request} request
 * @param {Object} env
 * @param {string} env.VAPID_PUBLIC_KEY
 */
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const publicKey = env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      return new Response(JSON.stringify({ error: 'Push notifications not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ publicKey }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('VAPID key error:', error);
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

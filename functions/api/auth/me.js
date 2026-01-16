/**
 * Get Current User
 * GET /api/auth/me
 *
 * Returns the currently authenticated user or null.
 */

import {
  parseSessionCookie,
  getUserFromSession,
  checkIsSubscribed,
  corsHeaders,
} from './_utils.js';

/**
 * Get current authenticated user
 */
export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const token = parseSessionCookie(request.headers.get('Cookie'));
    const user = await getUserFromSession(env.AUTH_DB, token);

    if (user) {
      // Check if user is subscribed to newsletter
      const isSubscribed = await checkIsSubscribed(env.AUTH_DB, user.email);
      return new Response(JSON.stringify({ user: { ...user, isSubscribed } }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ user: null }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return new Response(JSON.stringify({ user: null }), {
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
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    },
  });
}

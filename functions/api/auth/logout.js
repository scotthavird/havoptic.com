/**
 * Logout
 * POST /api/auth/logout
 *
 * Clears the user's session and cookie.
 */

import {
  parseSessionCookie,
  createClearSessionCookie,
  corsHeaders,
  isProduction,
} from './_utils.js';

/**
 * Logout user - clear session and cookie
 */
export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const token = parseSessionCookie(request.headers.get('Cookie'));

    // Delete session from database if token exists
    if (token) {
      await env.AUTH_DB.prepare(
        'DELETE FROM sessions WHERE token = ?'
      ).bind(token).run();
    }

    const isProd = isProduction(request);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createClearSessionCookie(isProd),
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);

    // Still clear the cookie even if DB operation fails
    const isProd = isProduction(request);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createClearSessionCookie(isProd),
        ...corsHeaders,
      },
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

/**
 * Gated Feature Matrix API
 * GET /api/feature-matrix
 *
 * Returns feature comparison matrix - requires authentication.
 */

import {
  parseSessionCookie,
  getUserFromSession,
  corsHeaders,
} from './auth/_utils.js';

/**
 * Get feature matrix data (auth required)
 */
export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    // Check authentication
    const token = parseSessionCookie(request.headers.get('Cookie'));
    const user = await getUserFromSession(env.AUTH_DB, token);

    // Require authentication for feature matrix
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'Sign in with GitHub to access the feature comparison matrix',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Fetch feature matrix from static file
    const url = new URL(request.url);
    const matrixResponse = await fetch(new URL('/data/feature-matrix.json', url.origin));

    if (!matrixResponse.ok) {
      return new Response(JSON.stringify({ error: 'Feature matrix not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const matrixData = await matrixResponse.json();

    return new Response(JSON.stringify(matrixData), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in /api/feature-matrix:', error);
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
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    },
  });
}

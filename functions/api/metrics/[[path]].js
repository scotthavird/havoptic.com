/**
 * Gated Metrics API
 * GET /api/metrics/:type
 *
 * Returns metrics data - requires authentication.
 * Supports: github-stats, npm-downloads, velocity
 */

import {
  parseSessionCookie,
  getUserFromSession,
  corsHeaders,
} from '../auth/_utils.js';

// Valid metrics endpoints
const VALID_METRICS = ['github-stats', 'npm-downloads', 'velocity'];

/**
 * Get metrics data (auth required)
 */
export async function onRequestGet(context) {
  const { env, request, params } = context;

  try {
    // Check authentication
    const token = parseSessionCookie(request.headers.get('Cookie'));
    const user = await getUserFromSession(env.AUTH_DB, token);

    // Require authentication for metrics
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'Sign in with GitHub to access metrics data',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Determine which metrics file to serve
    const path = params.path?.join('/') || 'github-stats';

    // Validate the requested metrics type
    if (!VALID_METRICS.includes(path)) {
      return new Response(JSON.stringify({
        error: 'Invalid metrics type',
        validTypes: VALID_METRICS,
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Fetch metrics data from static file
    const url = new URL(request.url);
    const metricsFile = `/data/metrics/${path}.json`;
    const metricsResponse = await fetch(new URL(metricsFile, url.origin));

    if (!metricsResponse.ok) {
      return new Response(JSON.stringify({ error: 'Metrics not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const metricsData = await metricsResponse.json();

    return new Response(JSON.stringify(metricsData), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in /api/metrics:', error);
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

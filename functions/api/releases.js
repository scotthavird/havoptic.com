/**
 * Gated Releases API
 * GET /api/releases
 *
 * Returns release data with gating based on authentication:
 * - Anonymous: Last 5 releases per tool
 * - Authenticated: Full release history
 */

import {
  parseSessionCookie,
  getUserFromSession,
  corsHeaders,
} from './auth/_utils.js';

const ANONYMOUS_LIMIT = 5; // Last N releases per tool for anonymous users

/**
 * Get releases with gating based on auth status
 */
export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    // Check authentication
    const token = parseSessionCookie(request.headers.get('Cookie'));
    const user = await getUserFromSession(env.AUTH_DB, token);

    // Fetch full releases data from static file
    const url = new URL(request.url);
    const releasesResponse = await fetch(new URL('/data/releases.json', url.origin));

    if (!releasesResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch releases' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const releasesData = await releasesResponse.json();

    // Authenticated users get full data
    if (user) {
      return new Response(JSON.stringify(releasesData), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Anonymous users get limited data
    const toolReleases = {};

    // Group releases by tool
    for (const release of releasesData.releases) {
      if (!toolReleases[release.tool]) {
        toolReleases[release.tool] = [];
      }
      toolReleases[release.tool].push(release);
    }

    // Take only the most recent N releases per tool
    const limitedReleases = [];
    for (const tool of Object.keys(toolReleases)) {
      const sorted = toolReleases[tool]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, ANONYMOUS_LIMIT);
      limitedReleases.push(...sorted);
    }

    // Sort combined releases by date (newest first)
    limitedReleases.sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(JSON.stringify({
      lastUpdated: releasesData.lastUpdated,
      releases: limitedReleases,
      _limited: true,
      _message: 'Sign in with GitHub to see all releases',
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in /api/releases:', error);
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

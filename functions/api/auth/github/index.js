/**
 * GitHub OAuth Initiation
 * GET /api/auth/github
 *
 * Redirects user to GitHub for OAuth authorization.
 * Stores state parameter in cookie for CSRF protection.
 */

/**
 * Initiate GitHub OAuth flow
 */
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Get redirect URL from query param or default to home
  const redirectAfter = url.searchParams.get('redirect') || '/';

  // Store state and redirect in cookies (10 min expiry)
  const cookieOptions = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=600';

  // Build GitHub authorization URL
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/github/callback`);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');
  githubAuthUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': githubAuthUrl.toString(),
      'Set-Cookie': [
        `oauth_state=${state}; ${cookieOptions}`,
        `oauth_redirect=${encodeURIComponent(redirectAfter)}; ${cookieOptions}`,
      ].join(', '),
    },
  });
}

/**
 * GitHub OAuth Callback
 * GET /api/auth/github/callback
 *
 * Handles the OAuth callback from GitHub.
 * Creates/updates user in D1 and establishes session.
 */

import {
  generateSessionToken,
  createSessionCookie,
  SESSION_DURATION_MS,
  isProduction,
} from '../_utils.js';

/**
 * Handle GitHub OAuth callback
 */
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Handle OAuth errors from GitHub
  if (error) {
    console.error('GitHub OAuth error:', error, errorDescription);
    return redirectWithError(url.origin, errorDescription || 'GitHub authorization was denied');
  }

  if (!code) {
    return redirectWithError(url.origin, 'No authorization code received');
  }

  // Verify state (CSRF protection)
  const cookies = request.headers.get('Cookie') || '';
  const storedState = parseCookie(cookies, 'oauth_state');

  if (!state || state !== storedState) {
    return redirectWithError(url.origin, 'Invalid state parameter - please try again');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token error:', tokenData.error, tokenData.error_description);
      return redirectWithError(url.origin, 'Failed to authenticate with GitHub');
    }

    // Fetch user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Havoptic',
      },
    });

    if (!userResponse.ok) {
      console.error('GitHub user fetch failed:', userResponse.status);
      return redirectWithError(url.origin, 'Failed to fetch user profile');
    }

    const githubUser = await userResponse.json();

    // Fetch user email if not public
    let email = githubUser.email;
    if (!email) {
      try {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Havoptic',
          },
        });

        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();
          const primaryEmail = emails.find(e => e.primary && e.verified);
          email = primaryEmail?.email || null;
        }
      } catch (emailError) {
        console.error('Error fetching GitHub emails:', emailError);
      }
    }

    // Create or update user in D1
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.AUTH_DB.prepare(`
      INSERT INTO users (id, github_id, github_username, github_avatar_url, email, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(github_id) DO UPDATE SET
        github_username = excluded.github_username,
        github_avatar_url = excluded.github_avatar_url,
        email = COALESCE(excluded.email, users.email),
        last_login = excluded.last_login
    `).bind(
      userId,
      githubUser.id,
      githubUser.login,
      githubUser.avatar_url || null,
      email,
      now,
      now
    ).run();

    // Get the actual user ID (may be existing user)
    const user = await env.AUTH_DB.prepare(
      'SELECT id FROM users WHERE github_id = ?'
    ).bind(githubUser.id).first();

    if (!user) {
      return redirectWithError(url.origin, 'Failed to create user account');
    }

    // Create session
    const sessionToken = await generateSessionToken();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    await env.AUTH_DB.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      user.id,
      sessionToken,
      expiresAt,
      request.headers.get('User-Agent') || null,
      request.headers.get('CF-Connecting-IP') || null
    ).run();

    // Get redirect destination
    const redirectAfter = decodeURIComponent(
      parseCookie(cookies, 'oauth_redirect') || '/'
    );

    // Build redirect URL (handle hash routing)
    const redirectUrl = redirectAfter.startsWith('/')
      ? `${url.origin}/#${redirectAfter}`
      : `${url.origin}/#/`;

    const isProd = isProduction(request);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Set-Cookie': createSessionCookie(sessionToken, isProd),
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return redirectWithError(url.origin, 'Authentication failed - please try again');
  }
}

/**
 * Parse a specific cookie value from cookie header
 */
function parseCookie(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Redirect to home with error message
 */
function redirectWithError(origin, message) {
  const encodedMessage = encodeURIComponent(message);
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${origin}/#/?auth_error=${encodedMessage}`,
    },
  });
}

/**
 * Subscriber Preferences API
 * GET/POST /api/preferences
 *
 * Allows subscribers to manage their notification preferences.
 * Uses email + token for authentication (token sent in unsubscribe emails).
 *
 * Environment bindings:
 * - AUTH_DB: D1 database for subscriber data
 */

import {
  corsHeaders,
  checkRateLimit,
  getSubscriber,
  getSubscriberPreferences,
  updateToolPreference,
  updateContentPreference,
  logAuditEvent,
  EMAIL_REGEX,
} from './_newsletter-utils.js';

// Valid tool IDs
const VALID_TOOLS = [
  'claude-code',
  'openai-codex',
  'cursor',
  'gemini-cli',
  'kiro',
  'github-copilot',
  'windsurf',
];

// Valid content types
const VALID_CONTENT_TYPES = ['release', 'weekly-digest', 'monthly-comparison'];

/**
 * GET /api/preferences?email=...
 * Returns subscriber preferences
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(env.AUTH_DB, clientIP, 'preferences-get', 20);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const email = url.searchParams.get('email');
    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get subscriber
    const subscriber = await getSubscriber(env.AUTH_DB, email);
    if (!subscriber) {
      return new Response(
        JSON.stringify({ error: 'Email not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get preferences
    const preferences = await getSubscriberPreferences(env.AUTH_DB, subscriber.id);

    // Return preferences with defaults (opt-out model: missing = enabled)
    const response = {
      email: subscriber.email,
      tools: {},
      content: {},
    };

    // Add all tools with their status (default true if not set)
    for (const tool of VALID_TOOLS) {
      response.tools[tool] = preferences.tools[tool] !== false;
    }

    // Add all content types with their status (default true if not set)
    for (const contentType of VALID_CONTENT_TYPES) {
      response.content[contentType] = preferences.content[contentType] !== false;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Preferences GET error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

/**
 * POST /api/preferences
 * Body: { email, tools?: { toolId: boolean }, content?: { type: boolean } }
 * Updates subscriber preferences
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(env.AUTH_DB, clientIP, 'preferences-post', 10);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const body = await request.json();
    const { email, tools, content } = body;

    // Validate email
    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get subscriber
    const subscriber = await getSubscriber(env.AUTH_DB, email);
    if (!subscriber) {
      return new Response(
        JSON.stringify({ error: 'Email not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const updates = [];

    // Update tool preferences
    if (tools && typeof tools === 'object') {
      for (const [toolId, enabled] of Object.entries(tools)) {
        if (VALID_TOOLS.includes(toolId) && typeof enabled === 'boolean') {
          await updateToolPreference(env.AUTH_DB, subscriber.id, toolId, enabled);
          updates.push({ type: 'tool', id: toolId, enabled });
        }
      }
    }

    // Update content preferences
    if (content && typeof content === 'object') {
      for (const [contentType, enabled] of Object.entries(content)) {
        if (VALID_CONTENT_TYPES.includes(contentType) && typeof enabled === 'boolean') {
          await updateContentPreference(env.AUTH_DB, subscriber.id, contentType, enabled);
          updates.push({ type: 'content', id: contentType, enabled });
        }
      }
    }

    // Log preference update
    if (updates.length > 0) {
      await logAuditEvent(env.AUTH_DB, {
        action: 'preference-update',
        email: subscriber.email,
        timestamp: new Date().toISOString(),
        source: JSON.stringify(updates),
        ipAddress: clientIP,
        userAgent: request.headers.get('User-Agent'),
      });
    }

    // Get updated preferences
    const preferences = await getSubscriberPreferences(env.AUTH_DB, subscriber.id);

    // Build response with all preferences
    const response = {
      email: subscriber.email,
      tools: {},
      content: {},
      updated: updates.length,
    };

    for (const tool of VALID_TOOLS) {
      response.tools[tool] = preferences.tools[tool] !== false;
    }

    for (const contentType of VALID_CONTENT_TYPES) {
      response.content[contentType] = preferences.content[contentType] !== false;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Preferences POST error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

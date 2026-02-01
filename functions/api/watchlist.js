/**
 * User Tool Watchlist API
 * GET /api/watchlist - Get user's watched tools
 * POST /api/watchlist - Add or remove a tool from watchlist
 */

import {
  parseSessionCookie,
  getUserFromSession,
  corsHeaders,
} from './auth/_utils.js';

// Valid tool IDs (must match ToolId type in src/types/release.ts)
const VALID_TOOL_IDS = [
  'claude-code',
  'openai-codex',
  'cursor',
  'gemini-cli',
  'kiro',
  'github-copilot',
  'windsurf',
];

/**
 * Get user's watched tools
 * GET /api/watchlist
 */
export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const token = parseSessionCookie(request.headers.get('Cookie'));
    const user = await getUserFromSession(env.AUTH_DB, token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', tools: [] }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get all watched tools for this user
    const results = await env.AUTH_DB.prepare(`
      SELECT tool_id, added_at
      FROM user_tool_watchlist
      WHERE user_id = ?
      ORDER BY added_at DESC
    `).bind(user.id).all();

    const tools = results.results.map(row => ({
      toolId: row.tool_id,
      addedAt: row.added_at,
    }));

    return new Response(JSON.stringify({ tools }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error in GET /api/watchlist:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', tools: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

/**
 * Add or remove a tool from watchlist
 * POST /api/watchlist
 * Body: { toolId: string, action: 'add' | 'remove' }
 */
export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const token = parseSessionCookie(request.headers.get('Cookie'));
    const user = await getUserFromSession(env.AUTH_DB, token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await request.json();
    const { toolId, action } = body;

    // Validate toolId
    if (!toolId || !VALID_TOOL_IDS.includes(toolId)) {
      return new Response(JSON.stringify({
        error: 'Invalid tool ID',
        validToolIds: VALID_TOOL_IDS,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate action
    if (!action || !['add', 'remove'].includes(action)) {
      return new Response(JSON.stringify({
        error: 'Invalid action. Must be "add" or "remove"',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (action === 'add') {
      // Add tool to watchlist (ignore if already exists)
      await env.AUTH_DB.prepare(`
        INSERT OR IGNORE INTO user_tool_watchlist (user_id, tool_id, added_at)
        VALUES (?, ?, datetime('now'))
      `).bind(user.id, toolId).run();
    } else {
      // Remove tool from watchlist
      await env.AUTH_DB.prepare(`
        DELETE FROM user_tool_watchlist
        WHERE user_id = ? AND tool_id = ?
      `).bind(user.id, toolId).run();
    }

    // Return updated watchlist
    const results = await env.AUTH_DB.prepare(`
      SELECT tool_id, added_at
      FROM user_tool_watchlist
      WHERE user_id = ?
      ORDER BY added_at DESC
    `).bind(user.id).all();

    const tools = results.results.map(row => ({
      toolId: row.tool_id,
      addedAt: row.added_at,
    }));

    return new Response(JSON.stringify({
      success: true,
      action,
      toolId,
      tools,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error in POST /api/watchlist:', error);
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

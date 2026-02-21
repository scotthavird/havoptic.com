/**
 * Email Open Tracking Endpoint
 * GET /api/t/open?sid=<send_id>
 *
 * Returns a 1x1 transparent GIF pixel and records the open event.
 * Deduplicates: only the first open per send_id is recorded.
 */

// 43-byte transparent 1x1 GIF
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sendId = url.searchParams.get('sid');

  // Always return the pixel immediately
  const response = new Response(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': '43',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });

  if (sendId && env.AUTH_DB) {
    context.waitUntil(recordOpen(env.AUTH_DB, sendId, request));
  }

  return response;
}

async function recordOpen(db, sendId, request) {
  try {
    // Deduplicate: only record if no open event exists for this send_id
    const existing = await db.prepare(
      "SELECT 1 FROM email_events WHERE send_id = ? AND event_type = 'open' LIMIT 1"
    ).bind(sendId).first();

    if (existing) return;

    await db.prepare(`
      INSERT INTO email_events (send_id, event_type, ip, user_agent, occurred_at)
      VALUES (?, 'open', ?, ?, ?)
    `).bind(
      sendId,
      request.headers.get('CF-Connecting-IP') || null,
      request.headers.get('User-Agent') || null,
      new Date().toISOString()
    ).run();
  } catch (e) {
    console.error('Failed to record open event:', e);
  }
}

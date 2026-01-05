/**
 * Newsletter Subscribe API
 * POST /api/subscribe
 *
 * Handles newsletter subscription requests.
 * Stores subscribers in R2 bucket and validates email format.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBSCRIBERS_KEY = 'subscribers.json';
const RATE_LIMIT_KEY = 'rate-limits/subscribe.json';

// Rate limiting: 5 requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms
const RATE_LIMIT_MAX = 5;

async function checkRateLimit(ip, env) {
  try {
    const object = await env.NEWSLETTER_BUCKET.get(RATE_LIMIT_KEY);
    let limits = {};
    if (object) {
      limits = JSON.parse(await object.text());
    }

    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Clean old entries and get current count for this IP
    const ipLimits = (limits[ip] || []).filter(ts => ts > windowStart);

    if (ipLimits.length >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0 };
    }

    // Add current request
    ipLimits.push(now);
    limits[ip] = ipLimits;

    // Clean up old IPs (older than 5 minutes)
    const cleanupThreshold = now - 5 * 60 * 1000;
    for (const key of Object.keys(limits)) {
      limits[key] = limits[key].filter(ts => ts > cleanupThreshold);
      if (limits[key].length === 0) {
        delete limits[key];
      }
    }

    // Save updated limits
    await env.NEWSLETTER_BUCKET.put(RATE_LIMIT_KEY, JSON.stringify(limits), {
      httpMetadata: { contentType: 'application/json' },
    });

    return { allowed: true, remaining: RATE_LIMIT_MAX - ipLimits.length };
  } catch (e) {
    console.error('Rate limit check error:', e);
    // Allow request if rate limiting fails
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }
}

/**
 * @param {Request} request
 * @param {Object} env
 * @param {R2Bucket} env.NEWSLETTER_BUCKET
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Rate limiting check
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await checkRateLimit(clientIP, env);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
            ...corsHeaders,
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get current subscribers from R2
    let subscribers = [];
    try {
      const object = await env.NEWSLETTER_BUCKET.get(SUBSCRIBERS_KEY);
      if (object) {
        const text = await object.text();
        subscribers = JSON.parse(text);
      }
    } catch (e) {
      // File doesn't exist yet or parse error, start fresh
      subscribers = [];
    }

    // Check if already subscribed
    const existingSubscriber = subscribers.find(s => s.email === normalizedEmail);
    if (existingSubscriber) {
      return new Response(
        JSON.stringify({ message: 'Already subscribed', alreadySubscribed: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Add new subscriber
    const newSubscriber = {
      email: normalizedEmail,
      subscribedAt: new Date().toISOString(),
      source: 'website',
    };
    subscribers.push(newSubscriber);

    // Save back to R2
    await env.NEWSLETTER_BUCKET.put(
      SUBSCRIBERS_KEY,
      JSON.stringify(subscribers, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    );

    return new Response(
      JSON.stringify({ message: 'Successfully subscribed', success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Subscribe error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

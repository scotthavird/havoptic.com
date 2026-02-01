/**
 * Web Push Utilities
 * RFC 8291 compliant push encryption for Cloudflare Workers
 */

// Convert base64url to Uint8Array
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64 + padding);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64url(uint8array) {
  const base64 = btoa(String.fromCharCode(...uint8array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// HKDF (RFC 5869) using Web Crypto API
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

// Generate EC key pair for ECDH
async function generateECDHKeyPair() {
  return await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
}

// Export public key in uncompressed format
async function exportPublicKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

// ECDH key agreement
async function deriveSharedSecret(privateKey, publicKeyBytes) {
  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
  return new Uint8Array(bits);
}

// Encrypt payload using AES-128-GCM with RFC 8291 encoding
async function encryptPayload(payload, subscription, vapidKeys) {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(JSON.stringify(payload));

  // Get subscriber keys
  const p256dh = base64urlToUint8Array(subscription.keys.p256dh);
  const auth = base64urlToUint8Array(subscription.keys.auth);

  // Generate ephemeral ECDH key pair
  const { privateKey, publicKey } = await generateECDHKeyPair();
  const localPublicKey = await exportPublicKey(publicKey);

  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(privateKey, p256dh);

  // Build info strings per RFC 8291
  const keyInfoBuffer = new Uint8Array([
    ...encoder.encode('WebPush: info\0'),
    ...p256dh,
    ...localPublicKey,
  ]);

  // Derive content encryption key (CEK) and nonce
  const prkKey = await hkdf(auth, sharedSecret, keyInfoBuffer, 32);
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');

  const cek = await hkdf(new Uint8Array(0), prkKey, cekInfo, 16);
  const nonce = await hkdf(new Uint8Array(0), prkKey, nonceInfo, 12);

  // Add padding delimiter per RFC 8291
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 0x02; // Delimiter

  // Encrypt with AES-GCM
  const cryptoKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cryptoKey, paddedPayload);

  // Build final encrypted message per RFC 8188
  const recordSize = 4096;
  const header = new Uint8Array(86);
  const view = new DataView(header.buffer);

  // Salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  header.set(salt, 0);

  // Record size (4 bytes, big-endian)
  view.setUint32(16, recordSize, false);

  // Key ID length (1 byte)
  header[20] = 65; // Length of uncompressed P-256 public key

  // Public key (65 bytes)
  header.set(localPublicKey, 21);

  // Combine header and ciphertext
  const encrypted = new Uint8Array(header.length + ciphertext.byteLength);
  encrypted.set(header);
  encrypted.set(new Uint8Array(ciphertext), header.length);

  return encrypted;
}

// Create VAPID JWT for push service authentication
async function createVapidJwt(endpoint, vapidKeys) {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const payload = {
    aud: audience,
    exp: expiration,
    sub: 'mailto:admin@havoptic.com',
  };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const privateKeyBytes = base64urlToUint8Array(vapidKeys.privateKey);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign with ECDSA
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert from DER to raw format (P1363)
  const signatureB64 = uint8ArrayToBase64url(new Uint8Array(signature));

  return `${signingInput}.${signatureB64}`;
}

/**
 * Send a Web Push notification
 * @param {Object} subscription - Push subscription with endpoint and keys
 * @param {Object} payload - Notification payload
 * @param {Object} vapidKeys - { publicKey, privateKey } in base64url format
 * @returns {Promise<{success: boolean, status?: number, error?: string}>}
 */
export async function sendPushNotification(subscription, payload, vapidKeys) {
  try {
    // Encrypt the payload
    const encrypted = await encryptPayload(payload, subscription, vapidKeys);

    // Create VAPID JWT
    const jwt = await createVapidJwt(subscription.endpoint, vapidKeys);

    // Build authorization header
    const vapidPublicKey = vapidKeys.publicKey;
    const authorization = `vapid t=${jwt}, k=${vapidPublicKey}`;

    // Send to push service
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': encrypted.length.toString(),
        Authorization: authorization,
        TTL: '86400', // 24 hours
        Urgency: 'normal',
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status };
    }

    // Handle expired/invalid subscriptions
    if (response.status === 404 || response.status === 410) {
      return { success: false, status: response.status, error: 'subscription_expired' };
    }

    const errorText = await response.text();
    return { success: false, status: response.status, error: errorText };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all push subscriptions from D1
 */
export async function getAllPushSubscriptions(db) {
  const result = await db
    .prepare('SELECT id, user_id, endpoint, p256dh, auth, tool_filters FROM push_subscriptions WHERE failed_attempts < 3')
    .all();
  return result.results || [];
}

/**
 * Get push subscriptions filtered by tools (for users watching specific tools)
 * @param {D1Database} db
 * @param {string[]} toolIds - Array of tool IDs to match
 */
export async function getPushSubscriptionsForTools(db, toolIds) {
  const allSubscriptions = await getAllPushSubscriptions(db);

  // Filter subscriptions based on tool_filters
  return allSubscriptions.filter((sub) => {
    if (!sub.tool_filters) {
      // null = all tools
      return true;
    }
    try {
      const filters = JSON.parse(sub.tool_filters);
      // Subscription is interested if any of the release tools match their filters
      return toolIds.some((toolId) => filters.includes(toolId));
    } catch {
      return true; // Invalid JSON = treat as all tools
    }
  });
}

/**
 * Increment failed attempt count for a subscription
 */
export async function incrementFailedAttempt(db, subscriptionId) {
  await db
    .prepare('UPDATE push_subscriptions SET failed_attempts = failed_attempts + 1 WHERE id = ?')
    .bind(subscriptionId)
    .run();
}

/**
 * Delete a push subscription (e.g., when expired)
 */
export async function deletePushSubscription(db, subscriptionId) {
  await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(subscriptionId).run();
}

/**
 * Delete subscription by endpoint (for handling expired subscriptions)
 */
export async function deletePushSubscriptionByEndpoint(db, endpoint) {
  await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
}

/**
 * Get push subscription by endpoint
 */
export async function getPushSubscriptionByEndpoint(db, endpoint) {
  return await db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).first();
}

/**
 * Create or update a push subscription
 */
export async function upsertPushSubscription(db, subscription, userId, toolFilters = null) {
  const existing = await getPushSubscriptionByEndpoint(db, subscription.endpoint);

  if (existing) {
    // Update existing subscription
    await db
      .prepare(
        `UPDATE push_subscriptions
         SET user_id = ?, p256dh = ?, auth = ?, tool_filters = ?, failed_attempts = 0
         WHERE endpoint = ?`
      )
      .bind(userId, subscription.keys.p256dh, subscription.keys.auth, toolFilters, subscription.endpoint)
      .run();
    return existing.id;
  }

  // Create new subscription
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, tool_filters)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, toolFilters)
    .run();
  return id;
}

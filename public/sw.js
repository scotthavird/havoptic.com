/**
 * Havoptic Service Worker
 * Handles Web Push notifications and offline caching for AI tool releases
 */

const HAVOPTIC_URL = 'https://havoptic.com';

// Cache versioning — bump version to invalidate old caches
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `havoptic-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `havoptic-runtime-${CACHE_VERSION}`;
const IMAGES_CACHE = `havoptic-images-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, RUNTIME_CACHE, IMAGES_CACHE];

const OFFLINE_URL = '/offline.html';

// Max size for image cache (50MB)
const IMAGES_CACHE_MAX_SIZE = 200;

// ─── Push Notification Handlers ─────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event received but no data');
    return;
  }

  try {
    const payload = event.data.json();
    const { title, body, icon, badge, tag, releaseId, url, tool, version } = payload;

    const options = {
      body: body || 'New release available',
      icon: icon || '/apple-touch-icon.png',
      badge: badge || '/favicon-32x32.png',
      tag: tag || `release-${releaseId}`,
      data: {
        url: url || (releaseId ? `${HAVOPTIC_URL}/r/${releaseId}` : HAVOPTIC_URL),
        releaseId,
        tool,
        version,
      },
      vibrate: [100, 50, 100],
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View Release',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title || 'New AI Tool Release', options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || HAVOPTIC_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(HAVOPTIC_URL) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const subscription = await self.registration.pushManager.subscribe(
          event.oldSubscription?.options || {
            userVisibleOnly: true,
            applicationServerKey: null,
          }
        );

        await fetch(`${HAVOPTIC_URL}/api/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            oldEndpoint: event.oldSubscription?.endpoint,
          }),
          credentials: 'include',
        });
      } catch (error) {
        console.error('Failed to handle subscription change:', error);
      }
    })()
  );
});

// ─── Caching & Offline Support ──────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('havoptic-') && !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  );
});

// ─── Fetch Routing ──────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Allow callers to bypass SW cache entirely (e.g. useReleases background refresh)
  if (url.searchParams.has('_sw') && url.searchParams.get('_sw') === 'bypass') {
    return;
  }

  // API & data: stale-while-revalidate
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Hashed assets (JS/CSS from Vite build): cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images: cache-first with size limit
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE));
    return;
  }

  // HTML documents: network-first with offline fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ─── Caching Strategies ─────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      if (cacheName === IMAGES_CACHE) {
        trimCache(IMAGES_CACHE, IMAGES_CACHE_MAX_SIZE);
      }
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetchWithTimeout(request, 5000);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 408, statusText: 'Offline' });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetchWithTimeout(request, 5000);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return caches.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response('{}', {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    fetch(request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
}

/**
 * Havoptic Service Worker
 * Handles Web Push notifications for AI tool releases
 */

const HAVOPTIC_URL = 'https://havoptic.com';

// Handle push events
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

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || HAVOPTIC_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a tab open
      for (const client of windowClients) {
        if (client.url.startsWith(HAVOPTIC_URL) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new tab if none found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle subscription changes (e.g., browser regenerates keys)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Re-subscribe with same options
        const subscription = await self.registration.pushManager.subscribe(
          event.oldSubscription?.options || {
            userVisibleOnly: true,
            applicationServerKey: null, // Will be set from the page
          }
        );

        // Notify server of the change
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

// Basic install/activate for service worker lifecycle
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

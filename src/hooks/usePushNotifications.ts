import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

export type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsResult {
  /** Current permission state */
  permission: PushPermissionState;
  /** Whether push is currently subscribed */
  isSubscribed: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Request permission and subscribe */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Toggle subscription state */
  toggle: () => Promise<boolean>;
  /** Check if push is supported in this browser */
  isSupported: boolean;
}

// Convert base64 URL to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [permission, setPermission] = useState<PushPermissionState>('unsupported');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // Check initial state
  useEffect(() => {
    const checkState = async () => {
      if (!isSupported) {
        setPermission('unsupported');
        setIsLoading(false);
        return;
      }

      // Check notification permission
      const notifPermission = Notification.permission;
      setPermission(notifPermission as PushPermissionState);

      // Check if we have an active subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking push subscription:', err);
      }

      setIsLoading(false);
    };

    checkState();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;

      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PushPermissionState);

      if (permissionResult !== 'granted') {
        setError('Notification permission denied');
        trackEvent('push_permission_denied', { event_category: 'push' });
        return false;
      }

      trackEvent('push_permission_granted', { event_category: 'push' });

      // Get VAPID public key from server
      const keyResponse = await fetch('/api/push/vapid-public-key');
      if (!keyResponse.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { publicKey } = await keyResponse.json();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      trackEvent('push_subscribed', { event_category: 'push' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(message);
      console.error('Push subscription error:', err);
      trackEvent('push_subscribe_error', {
        event_category: 'push',
        error_message: message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          credentials: 'include',
        });
      }

      setIsSubscribed(false);
      trackEvent('push_unsubscribed', { event_category: 'push' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
      setError(message);
      console.error('Push unsubscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const toggle = useCallback(async (): Promise<boolean> => {
    if (isSubscribed) {
      return unsubscribe();
    }
    return subscribe();
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    toggle,
    isSupported,
  };
}

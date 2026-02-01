import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from './AuthContext';
import { useWatchlist } from './WatchlistContext';
import type { ToolId } from '../types/release';

const SEEN_ANNOUNCEMENT_KEY = 'havoptic_push_announcement_seen';
const SEEN_WATCHLIST_PROMPT_KEY = 'havoptic_push_watchlist_prompt_seen';

interface PushNotificationContextValue {
  // State
  showWatchlistPrompt: boolean;
  showAnnouncementBanner: boolean;
  showSuccessModal: boolean;
  subscribedTools: string[];
  promptToolId: ToolId | null;

  // Actions
  dismissWatchlistPrompt: () => void;
  dismissAnnouncementBanner: () => void;
  dismissSuccessModal: () => void;
  triggerWatchlistPrompt: (toolId: ToolId) => void;

  // From usePushNotifications
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  isSupported: boolean;
}

const PushNotificationContext = createContext<PushNotificationContextValue | null>(null);

interface PushNotificationProviderProps {
  children: ReactNode;
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const { user } = useAuth();
  const { watchedToolIds } = useWatchlist();
  const pushHook = usePushNotifications();

  const [showWatchlistPrompt, setShowWatchlistPrompt] = useState(false);
  const [showAnnouncementBanner, setShowAnnouncementBanner] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [subscribedTools, setSubscribedTools] = useState<string[]>([]);
  const [wasSubscribed, setWasSubscribed] = useState(false);
  const [promptToolId, setPromptToolId] = useState<ToolId | null>(null);

  // Check if user should see announcement banner (one-time for logged-in users)
  useEffect(() => {
    if (!user || !pushHook.isSupported || pushHook.isSubscribed || pushHook.permission === 'denied') {
      setShowAnnouncementBanner(false);
      return;
    }

    const seen = localStorage.getItem(SEEN_ANNOUNCEMENT_KEY);
    if (!seen) {
      // Small delay so it doesn't appear immediately on page load
      const timer = setTimeout(() => {
        setShowAnnouncementBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, pushHook.isSupported, pushHook.isSubscribed, pushHook.permission]);

  // Track subscription state changes to show success modal
  useEffect(() => {
    if (pushHook.isSubscribed && !wasSubscribed) {
      // Just subscribed!
      setSubscribedTools([...watchedToolIds]);
      setShowSuccessModal(true);
      setShowWatchlistPrompt(false);
      setShowAnnouncementBanner(false);
    }
    setWasSubscribed(pushHook.isSubscribed);
  }, [pushHook.isSubscribed, wasSubscribed, watchedToolIds]);

  const dismissWatchlistPrompt = useCallback(() => {
    setShowWatchlistPrompt(false);
    localStorage.setItem(SEEN_WATCHLIST_PROMPT_KEY, 'true');
  }, []);

  const dismissAnnouncementBanner = useCallback(() => {
    setShowAnnouncementBanner(false);
    localStorage.setItem(SEEN_ANNOUNCEMENT_KEY, 'true');
  }, []);

  const dismissSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
  }, []);

  const triggerWatchlistPrompt = useCallback((toolId: ToolId) => {
    // Only show if: logged in, supported, not subscribed, not denied, not seen before
    if (
      user &&
      pushHook.isSupported &&
      !pushHook.isSubscribed &&
      pushHook.permission !== 'denied' &&
      !localStorage.getItem(SEEN_WATCHLIST_PROMPT_KEY)
    ) {
      setPromptToolId(toolId);
      setShowWatchlistPrompt(true);
    }
  }, [user, pushHook.isSupported, pushHook.isSubscribed, pushHook.permission]);

  // Wrap subscribe to handle success modal
  const subscribe = useCallback(async (): Promise<boolean> => {
    const result = await pushHook.subscribe();
    return result;
  }, [pushHook]);

  return (
    <PushNotificationContext.Provider
      value={{
        showWatchlistPrompt,
        showAnnouncementBanner,
        showSuccessModal,
        subscribedTools,
        promptToolId,
        dismissWatchlistPrompt,
        dismissAnnouncementBanner,
        dismissSuccessModal,
        triggerWatchlistPrompt,
        permission: pushHook.permission,
        isSubscribed: pushHook.isSubscribed,
        isLoading: pushHook.isLoading,
        error: pushHook.error,
        subscribe,
        unsubscribe: pushHook.unsubscribe,
        isSupported: pushHook.isSupported,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotificationContext must be used within PushNotificationProvider');
  }
  return context;
}

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from './AuthContext';
import { useWatchlist } from './WatchlistContext';
import type { ToolId } from '../types/release';

const SEEN_WATCHLIST_PROMPT_KEY = 'havoptic_push_watchlist_prompt_seen';
const SEEN_SUCCESS_MODAL_KEY = 'havoptic_push_success_modal_seen';

interface PushNotificationContextValue {
  // State
  showWatchlistPrompt: boolean;
  showSuccessModal: boolean;
  subscribedTools: string[];
  promptToolId: ToolId | null;

  // Actions
  dismissWatchlistPrompt: () => void;
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [subscribedTools, setSubscribedTools] = useState<string[]>([]);
  const [wasSubscribed, setWasSubscribed] = useState(false);
  const [promptToolId, setPromptToolId] = useState<ToolId | null>(null);

  // Track subscription state changes to show success modal
  useEffect(() => {
    if (pushHook.isSubscribed && !wasSubscribed) {
      // Only show modal if user hasn't seen it before (fresh subscription)
      const hasSeenModal = localStorage.getItem(SEEN_SUCCESS_MODAL_KEY);
      if (!hasSeenModal) {
        setSubscribedTools([...watchedToolIds]);
        setShowSuccessModal(true);
        setShowWatchlistPrompt(false);
      }
    }
    setWasSubscribed(pushHook.isSubscribed);
  }, [pushHook.isSubscribed, wasSubscribed, watchedToolIds]);

  const dismissWatchlistPrompt = useCallback(() => {
    setShowWatchlistPrompt(false);
    localStorage.setItem(SEEN_WATCHLIST_PROMPT_KEY, 'true');
  }, []);

  const dismissSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    localStorage.setItem(SEEN_SUCCESS_MODAL_KEY, 'true');
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
        showSuccessModal,
        subscribedTools,
        promptToolId,
        dismissWatchlistPrompt,
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

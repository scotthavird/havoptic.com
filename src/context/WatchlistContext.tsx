import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { ToolId } from '../types/release';
import { useAuth } from './AuthContext';
import { trackWatchlistAction } from '../utils/analytics';

const STORAGE_KEY = 'havoptic_watchlist';

interface WatchedTool {
  toolId: ToolId;
  addedAt: string;
}

interface WatchlistContextValue {
  tools: WatchedTool[];
  watchedToolIds: ToolId[];
  watchCount: number;
  loading: boolean;
  error: string | null;
  toggleTool: (toolId: ToolId) => Promise<boolean>;
  isWatching: (toolId: ToolId) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

interface WatchlistProviderProps {
  children: ReactNode;
}

export function WatchlistProvider({ children }: WatchlistProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [tools, setTools] = useState<WatchedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load watchlist on mount and when auth changes
  useEffect(() => {
    if (authLoading) return;

    async function loadWatchlist() {
      setLoading(true);
      setError(null);

      if (user) {
        // Authenticated: fetch from API
        try {
          const response = await fetch('/api/watchlist', {
            credentials: 'include',
          });
          const data = await response.json();

          if (response.ok) {
            setTools(data.tools || []);
            // Also update localStorage as backup
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tools || []));
          } else {
            setError(data.error || 'Failed to load watchlist');
            setTools([]);
          }
        } catch (err) {
          console.error('Error fetching watchlist:', err);
          // Fall back to localStorage on network error
          const stored = localStorage.getItem(STORAGE_KEY);
          const storedTools = stored ? JSON.parse(stored) : [];
          setTools(storedTools);
        }
      } else {
        // Guest: load from localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          const storedTools = stored ? JSON.parse(stored) : [];
          setTools(storedTools);
        } catch {
          setTools([]);
        }
      }
      setLoading(false);
    }

    loadWatchlist();
  }, [user, authLoading]);

  // Sync localStorage watchlist to server on login
  useEffect(() => {
    if (!user || authLoading) return;

    async function syncLocalToServer() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      try {
        const localTools: WatchedTool[] = JSON.parse(stored);
        if (localTools.length === 0) return;

        // Add each local tool to server (API handles duplicates)
        for (const { toolId } of localTools) {
          await fetch('/api/watchlist', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolId, action: 'add' }),
          });
        }

        // Refresh watchlist from server
        const response = await fetch('/api/watchlist', {
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok) {
          setTools(data.tools || []);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tools || []));
        }
      } catch (err) {
        console.error('Error syncing watchlist:', err);
      }
    }

    syncLocalToServer();
  }, [user, authLoading]);

  const toggleTool = useCallback(async (toolId: ToolId): Promise<boolean> => {
    const isCurrentlyWatching = tools.some(t => t.toolId === toolId);
    const action = isCurrentlyWatching ? 'remove' : 'add';

    // Optimistic update
    const newTools = isCurrentlyWatching
      ? tools.filter(t => t.toolId !== toolId)
      : [...tools, { toolId, addedAt: new Date().toISOString() }];

    setTools(newTools);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTools));

    // Track analytics
    trackWatchlistAction(action, toolId);

    if (user) {
      // Authenticated: sync to server
      try {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolId, action }),
        });
        const data = await response.json();

        if (response.ok) {
          setTools(data.tools || []);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tools || []));
          return true;
        } else {
          // Revert on error
          setTools(tools);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
          setError(data.error);
          return false;
        }
      } catch (err) {
        console.error('Error updating watchlist:', err);
        // Keep optimistic update for offline support
        return true;
      }
    }

    return true;
  }, [user, tools]);

  const isWatching = useCallback((toolId: ToolId): boolean => {
    return tools.some(t => t.toolId === toolId);
  }, [tools]);

  const watchedToolIds = useMemo((): ToolId[] => {
    return tools.map(t => t.toolId);
  }, [tools]);

  const watchCount = useMemo((): number => {
    return tools.length;
  }, [tools]);

  return (
    <WatchlistContext.Provider value={{
      tools,
      watchedToolIds,
      watchCount,
      loading: loading || authLoading,
      error,
      toggleTool,
      isWatching,
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within WatchlistProvider');
  }
  return context;
}

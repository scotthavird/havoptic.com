import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ToolId } from '../types/release';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'havoptic_watchlist';

interface WatchedTool {
  toolId: ToolId;
  addedAt: string;
}

interface WatchlistState {
  tools: WatchedTool[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing user's tool watchlist
 * - For authenticated users: syncs with server via API
 * - For guests: persists to localStorage
 */
export function useWatchlist() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<WatchlistState>({
    tools: [],
    loading: true,
    error: null,
  });

  // Load watchlist on mount and when auth changes
  useEffect(() => {
    if (authLoading) return;

    async function loadWatchlist() {
      setState(prev => ({ ...prev, loading: true, error: null }));

      if (user) {
        // Authenticated: fetch from API
        try {
          const response = await fetch('/api/watchlist', {
            credentials: 'include',
          });
          const data = await response.json();

          if (response.ok) {
            setState({ tools: data.tools || [], loading: false, error: null });
            // Also update localStorage as backup
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tools || []));
          } else {
            setState({ tools: [], loading: false, error: data.error || 'Failed to load watchlist' });
          }
        } catch (err) {
          console.error('Error fetching watchlist:', err);
          // Fall back to localStorage on network error
          const stored = localStorage.getItem(STORAGE_KEY);
          const tools = stored ? JSON.parse(stored) : [];
          setState({ tools, loading: false, error: null });
        }
      } else {
        // Guest: load from localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          const tools = stored ? JSON.parse(stored) : [];
          setState({ tools, loading: false, error: null });
        } catch {
          setState({ tools: [], loading: false, error: null });
        }
      }
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
          setState(prev => ({ ...prev, tools: data.tools || [] }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tools || []));
        }
      } catch (err) {
        console.error('Error syncing watchlist:', err);
      }
    }

    syncLocalToServer();
  }, [user, authLoading]);

  const toggleTool = useCallback(async (toolId: ToolId): Promise<boolean> => {
    const isCurrentlyWatching = state.tools.some(t => t.toolId === toolId);
    const action = isCurrentlyWatching ? 'remove' : 'add';

    // Optimistic update
    setState(prev => {
      const newTools = isCurrentlyWatching
        ? prev.tools.filter(t => t.toolId !== toolId)
        : [...prev.tools, { toolId, addedAt: new Date().toISOString() }];
      return { ...prev, tools: newTools };
    });

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
          setState(prev => ({ ...prev, tools: data.tools || [] }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tools || []));
          return true;
        } else {
          // Revert on error
          setState(prev => {
            const revertedTools = isCurrentlyWatching
              ? [...prev.tools, { toolId, addedAt: new Date().toISOString() }]
              : prev.tools.filter(t => t.toolId !== toolId);
            return { ...prev, tools: revertedTools, error: data.error };
          });
          return false;
        }
      } catch (err) {
        console.error('Error updating watchlist:', err);
        // Keep optimistic update for offline support
        const newTools = isCurrentlyWatching
          ? state.tools.filter(t => t.toolId !== toolId)
          : [...state.tools, { toolId, addedAt: new Date().toISOString() }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTools));
        return true;
      }
    } else {
      // Guest: save to localStorage only
      const newTools = isCurrentlyWatching
        ? state.tools.filter(t => t.toolId !== toolId)
        : [...state.tools, { toolId, addedAt: new Date().toISOString() }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTools));
      return true;
    }
  }, [user, state.tools]);

  const isWatching = useCallback((toolId: ToolId): boolean => {
    return state.tools.some(t => t.toolId === toolId);
  }, [state.tools]);

  const watchedToolIds = useMemo((): ToolId[] => {
    return state.tools.map(t => t.toolId);
  }, [state.tools]);

  const watchCount = useMemo((): number => {
    return state.tools.length;
  }, [state.tools]);

  return {
    tools: state.tools,
    watchedToolIds,
    watchCount,
    loading: state.loading || authLoading,
    error: state.error,
    toggleTool,
    isWatching,
  };
}

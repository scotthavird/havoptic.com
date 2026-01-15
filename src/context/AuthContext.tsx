import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AuthState } from '../types/auth';

interface LoginOptions {
  subscribe?: boolean;
}

interface AuthContextValue extends AuthState {
  login: (options?: LoginOptions) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      const data = await response.json();
      setState({ user: data.user, loading: false, error: null });
    } catch (err) {
      console.error('Error fetching user:', err);
      setState({ user: null, loading: false, error: 'Failed to fetch user' });
    }
  }, []);

  // Check for auth errors in URL (from OAuth callback)
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const authError = params.get('auth_error');

    if (authError) {
      setState(prev => ({ ...prev, error: decodeURIComponent(authError) }));
      // Clean up URL
      const cleanHash = hash.split('?')[0] || '#/';
      window.history.replaceState(null, '', cleanHash);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((options?: LoginOptions) => {
    // Get current path for redirect after auth
    const currentPath = window.location.hash.slice(1) || '/';
    // Remove any query params from path
    const cleanPath = currentPath.split('?')[0];
    const subscribeParam = options?.subscribe ? '&subscribe=true' : '';
    window.location.href = `/api/auth/github?redirect=${encodeURIComponent(cleanPath)}${subscribeParam}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setState({ user: null, loading: false, error: null });
    } catch (err) {
      console.error('Logout failed:', err);
      // Still clear local state even if server request fails
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

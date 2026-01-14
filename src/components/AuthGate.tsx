import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginButton } from './LoginButton';

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
}

/**
 * Wrapper component that shows login prompt for unauthenticated users.
 * Use this to gate premium content behind authentication.
 */
export function AuthGate({ children, fallback, message }: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-claude" />
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="text-center py-8 sm:py-12 px-4">
        <div className="max-w-md mx-auto bg-slate-800/50 rounded-xl p-6 sm:p-8 border border-slate-700">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            Sign in to unlock full access
          </h3>
          <p className="text-sm sm:text-base text-slate-400 mb-6">
            {message || 'Get access to all releases, metrics, velocity data, and more.'}
          </p>
          <LoginButton variant="cta" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

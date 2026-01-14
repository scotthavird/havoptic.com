import { useAuth } from '../context/AuthContext';

interface LoginButtonProps {
  variant?: 'header' | 'cta';
  className?: string;
}

export function LoginButton({ variant = 'header', className = '' }: LoginButtonProps) {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className={`h-8 w-8 animate-pulse bg-slate-700 rounded-full ${className}`} />
    );
  }

  if (user) {
    return (
      <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
        {user.github_avatar_url && (
          <img
            src={user.github_avatar_url}
            alt={user.github_username}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-600"
          />
        )}
        <span className="text-xs sm:text-sm text-slate-300 hidden sm:inline truncate max-w-[100px]">
          {user.github_username}
        </span>
        <button
          onClick={logout}
          className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (variant === 'cta') {
    return (
      <button
        onClick={login}
        className={`inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white font-medium transition-colors ${className}`}
      >
        <GitHubIcon className="w-5 h-5" />
        <span>Sign in with GitHub</span>
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs sm:text-sm text-white transition-colors ${className}`}
    >
      <GitHubIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span className="hidden xs:inline">Sign in</span>
    </button>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      />
    </svg>
  );
}

import { LoginButton } from './LoginButton';

interface SignInPromptProps {
  message?: string;
  className?: string;
}

/**
 * Prompt shown when user is viewing limited data.
 * Encourages sign in for full access.
 */
export function SignInPrompt({ message, className = '' }: SignInPromptProps) {
  return (
    <div className={`bg-gradient-to-r from-slate-800/80 to-slate-800/40 border border-slate-700 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-white mb-1">
            Want to see more?
          </h3>
          <p className="text-sm text-slate-400">
            {message || 'Sign in with GitHub to unlock all releases, metrics, and more.'}
          </p>
        </div>
        <LoginButton variant="cta" className="w-full sm:w-auto" />
      </div>
    </div>
  );
}

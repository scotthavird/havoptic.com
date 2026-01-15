import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNewsletterBell } from '../context/NewsletterBellContext';

export function HeaderBell() {
  const { user } = useAuth();
  const { showBellInHeader, setHeaderBellRef } = useNewsletterBell();
  const { login } = useAuth();
  const bellRef = useRef<HTMLButtonElement>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Register ref with context for animation targeting
  useEffect(() => {
    if (bellRef.current) {
      setHeaderBellRef(bellRef.current);
    }
    return () => setHeaderBellRef(null);
  }, [setHeaderBellRef]);

  // Don't show if user is logged in (they're already subscribed)
  if (user) {
    return null;
  }

  // Don't show until animation completes (or if previously shown)
  if (!showBellInHeader) {
    // Still render invisible element for animation target
    return (
      <div
        ref={bellRef as unknown as React.RefObject<HTMLDivElement>}
        className="w-9 h-9"
        aria-hidden="true"
      />
    );
  }

  const handleClick = () => {
    setIsRinging(true);
    setTimeout(() => {
      setIsRinging(false);
      login();
    }, 500);
  };

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors group ${
          isRinging ? '' : 'animate-bell-pulse'
        }`}
        aria-label="Subscribe to newsletter"
      >
        {/* Glow effect behind the bell */}
        <div className="absolute inset-0 bg-amber-400/20 rounded-lg blur-md animate-glow-pulse" />

        {/* Bell icon */}
        <svg
          className={`relative w-5 h-5 text-amber-400 ${isRinging ? 'animate-bell-ring' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
        </svg>

        {/* Notification dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl whitespace-nowrap z-50">
          <p className="text-sm text-white font-medium">Get notified of new releases</p>
          <p className="text-xs text-slate-400">Sign in with GitHub</p>
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-l border-t border-slate-600 rotate-45" />
        </div>
      )}
    </div>
  );
}

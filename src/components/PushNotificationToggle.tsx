import { useState, useEffect } from 'react';
import { usePushNotificationContext } from '../context/PushNotificationContext';
import { useWatchlist } from '../context/WatchlistContext';

const SEEN_KEY = 'havoptic_push_badge_seen';

interface PushNotificationToggleProps {
  className?: string;
}

export function PushNotificationToggle({ className = '' }: PushNotificationToggleProps) {
  const { permission, isSubscribed, isLoading, error, subscribe, unsubscribe, isSupported } =
    usePushNotificationContext();
  const { watchCount } = useWatchlist();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState(false);

  // Check if user has seen the badge before
  useEffect(() => {
    if (!isSubscribed && isSupported && permission !== 'denied') {
      const seen = localStorage.getItem(SEEN_KEY);
      if (!seen) {
        setShowNewBadge(true);
      }
    }
  }, [isSubscribed, isSupported, permission]);

  // Mark as seen when user hovers or subscribes
  const markAsSeen = () => {
    localStorage.setItem(SEEN_KEY, 'true');
    setShowNewBadge(false);
  };

  // Don't render if push is not supported
  if (!isSupported) {
    return null;
  }

  // Don't render if permission was permanently denied
  if (permission === 'denied') {
    return null;
  }

  const handleClick = async () => {
    markAsSeen();
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
    // Mark as seen after hovering (they've discovered the feature)
    if (showNewBadge) {
      setTimeout(markAsSeen, 1500);
    }
  };

  const tooltipText = isSubscribed
    ? `Notifications ON${watchCount > 0 ? ` (${watchCount} tool${watchCount > 1 ? 's' : ''})` : ''}`
    : 'Enable browser notifications';

  const ariaLabel = isSubscribed ? 'Disable browser notifications' : 'Enable browser notifications';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isLoading}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isSubscribed
            ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 hover:from-amber-500/40 hover:to-amber-600/30 text-amber-400 ring-1 ring-amber-500/30'
            : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-300'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        aria-label={ariaLabel}
        aria-pressed={isSubscribed}
      >
        {/* Glow effect when subscribed */}
        {isSubscribed && (
          <div className="absolute inset-0 bg-amber-400/10 rounded-lg blur-md animate-pulse" />
        )}

        {/* Bell icon */}
        <svg
          className={`relative w-5 h-5 ${isLoading ? 'animate-pulse' : ''} ${
            isSubscribed ? 'animate-none' : ''
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {isSubscribed ? (
            // Filled bell with sound waves (subscribed)
            <>
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </>
          ) : (
            // Outline bell (not subscribed)
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          )}
        </svg>

        {/* Active indicator dot when subscribed */}
        {isSubscribed && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-slate-900" />
        )}

        {/* "New" badge when not subscribed and hasn't been seen */}
        {showNewBadge && !isSubscribed && (
          <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded shadow-lg animate-pulse">
            NEW
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isLoading && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl whitespace-nowrap z-50">
          <p className="text-sm text-white font-medium">{tooltipText}</p>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          {!isSubscribed && (
            <p className="text-xs text-slate-400 mt-0.5">Click to enable</p>
          )}
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-l border-t border-slate-600 rotate-45" />
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface PushNotificationToggleProps {
  className?: string;
}

export function PushNotificationToggle({ className = '' }: PushNotificationToggleProps) {
  const { permission, isSubscribed, isLoading, error, toggle, isSupported } = usePushNotifications();
  const [showTooltip, setShowTooltip] = useState(false);

  // Don't render if push is not supported
  if (!isSupported) {
    return null;
  }

  // Don't render if permission was permanently denied
  if (permission === 'denied') {
    return null;
  }

  const handleClick = async () => {
    await toggle();
  };

  const tooltipText = isSubscribed
    ? 'Browser notifications enabled'
    : 'Enable browser notifications for new releases';

  const ariaLabel = isSubscribed ? 'Disable browser notifications' : 'Enable browser notifications';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isLoading}
        className={`relative p-2 rounded-lg transition-colors ${
          isSubscribed
            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
            : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-300'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        aria-label={ariaLabel}
        aria-pressed={isSubscribed}
      >
        {/* Bell icon with notification indicator */}
        <svg
          className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {isSubscribed ? (
            // Filled bell (subscribed)
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          ) : (
            // Outline bell (not subscribed)
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          )}
        </svg>

        {/* Active indicator dot */}
        {isSubscribed && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isLoading && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl whitespace-nowrap z-50">
          <p className="text-sm text-white font-medium">{tooltipText}</p>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-l border-t border-slate-600 rotate-45" />
        </div>
      )}
    </div>
  );
}

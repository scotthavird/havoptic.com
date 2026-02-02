import { useState, useEffect } from 'react';
import { usePushNotificationContext } from '../context/PushNotificationContext';
import { useAuth } from '../context/AuthContext';
import { TOOL_CONFIG, type ToolId } from '../types/release';

const DISMISSED_KEY = 'havoptic_push_inline_dismissed';
const DISMISSED_UNTIL_KEY = 'havoptic_push_inline_dismissed_until';

interface PushInlinePromptProps {
  /** The tool being viewed (if filtered), or null for "all" */
  toolId?: ToolId | null;
}

export function PushInlinePrompt({ toolId }: PushInlinePromptProps) {
  const { user } = useAuth();
  const { isSubscribed, isSupported, permission, subscribe, isLoading } = usePushNotificationContext();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Don't show if: not logged in, not supported, already subscribed, permission denied
    if (!user || !isSupported || isSubscribed || permission === 'denied') {
      setIsVisible(false);
      return;
    }

    // Check if permanently dismissed
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsVisible(false);
      return;
    }

    // Check if temporarily dismissed (24 hours)
    const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setIsVisible(false);
      return;
    }

    // Show with slight delay for smooth appearance
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [user, isSupported, isSubscribed, permission]);

  if (!isVisible) {
    return null;
  }

  const toolName = toolId ? TOOL_CONFIG[toolId]?.displayName : null;

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleMaybeLater = () => {
    setIsDismissing(true);
    // Dismiss for 24 hours
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleNeverShow = () => {
    setIsDismissing(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
    setTimeout(() => setIsVisible(false), 300);
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isDismissing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />

        <div className="relative p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Icon and text */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Never miss an update
                </h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {toolName ? (
                  <>Get instant browser alerts when <span className="text-amber-400 font-medium">{toolName}</span> ships new releases.</>
                ) : (
                  <>Get instant browser alerts when your favorite AI tools ship new releases.</>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-wait"
              >
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                onClick={handleMaybeLater}
                className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Subtle dismiss permanently link */}
          <button
            onClick={handleNeverShow}
            className="absolute top-3 right-3 p-1 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Don't show again"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

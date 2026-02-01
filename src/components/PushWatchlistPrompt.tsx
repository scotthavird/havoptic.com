import { useEffect, useState } from 'react';
import { usePushNotificationContext } from '../context/PushNotificationContext';
import { TOOL_CONFIG } from '../types/release';

export function PushWatchlistPrompt() {
  const { showWatchlistPrompt, dismissWatchlistPrompt, subscribe, isLoading, promptToolId } =
    usePushNotificationContext();
  const [isVisible, setIsVisible] = useState(false);

  const toolConfig = promptToolId ? TOOL_CONFIG[promptToolId] : null;

  // Animate in
  useEffect(() => {
    if (showWatchlistPrompt) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showWatchlistPrompt]);

  if (!showWatchlistPrompt || !toolConfig) {
    return null;
  }

  const handleEnable = async () => {
    await subscribe();
  };

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Colored top bar */}
        <div className={`h-1 ${toolConfig.bgColor}`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`p-2 rounded-lg ${toolConfig.bgColor}/20`}>
              <svg className={`w-5 h-5 ${toolConfig.color}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm">
                Get notified when {toolConfig.shortName} ships?
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Enable browser notifications to never miss a release.
              </p>
            </div>
            <button
              onClick={dismissWatchlistPrompt}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${toolConfig.bgColor} text-white hover:opacity-90 disabled:opacity-50`}
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={dismissWatchlistPrompt}
              className="px-4 py-2 rounded-lg font-medium text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

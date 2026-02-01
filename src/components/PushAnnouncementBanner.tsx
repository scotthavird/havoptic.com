import { useEffect, useState } from 'react';
import { usePushNotificationContext } from '../context/PushNotificationContext';

export function PushAnnouncementBanner() {
  const { showAnnouncementBanner, dismissAnnouncementBanner, subscribe, isLoading } = usePushNotificationContext();
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    if (showAnnouncementBanner) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showAnnouncementBanner]);

  if (!showAnnouncementBanner) {
    return null;
  }

  const handleEnable = async () => {
    await subscribe();
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Content */}
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-2xl" role="img" aria-label="bell">
                🔔
              </span>
              <div>
                <p className="font-semibold text-sm sm:text-base">
                  New: Browser Notifications
                </p>
                <p className="text-amber-100 text-xs sm:text-sm">
                  Get instant alerts when your watched tools ship new releases
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-4 py-1.5 bg-white text-amber-600 rounded-lg font-semibold text-sm hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={dismissAnnouncementBanner}
                className="p-1.5 hover:bg-amber-700/50 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

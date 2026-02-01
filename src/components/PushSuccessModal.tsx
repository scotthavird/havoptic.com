import { useEffect, useState } from 'react';
import { usePushNotificationContext } from '../context/PushNotificationContext';
import { TOOL_CONFIG, type ToolId } from '../types/release';

export function PushSuccessModal() {
  const { showSuccessModal, dismissSuccessModal, subscribedTools } = usePushNotificationContext();
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showSuccessModal]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSuccessModal) {
        dismissSuccessModal();
      }
    };

    if (showSuccessModal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showSuccessModal, dismissSuccessModal]);

  if (!showSuccessModal) {
    return null;
  }

  const hasWatchedTools = subscribedTools.length > 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissSuccessModal} />

      {/* Modal */}
      <div
        className={`relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Success animation header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3 animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 id="success-modal-title" className="text-xl font-bold text-white">
            Notifications Enabled!
          </h2>
          <p className="text-green-100 text-sm mt-1">You're all set to receive release alerts</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {hasWatchedTools ? (
            <>
              <p className="text-slate-300 text-sm mb-4">
                You'll be notified when these tools ship new releases:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {subscribedTools.map((toolId) => {
                  const config = TOOL_CONFIG[toolId as ToolId];
                  if (!config) return null;
                  return (
                    <span
                      key={toolId}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColor} text-white`}
                    >
                      <span
                        className="w-2 h-2 rounded-full bg-white/30"
                        style={{ boxShadow: '0 0 0 2px currentColor' }}
                      />
                      {config.shortName}
                    </span>
                  );
                })}
              </div>
              <p className="text-slate-500 text-xs">
                Tip: Add more tools to your watchlist to get notified about them too.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-300 text-sm mb-4">
                You'll receive notifications for <strong>all AI coding tools</strong>.
              </p>
              <p className="text-slate-500 text-xs">
                Tip: Add tools to your watchlist to only get notified about specific ones.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={dismissSuccessModal}
            className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

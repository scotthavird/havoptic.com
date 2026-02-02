import { useState, useRef, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePushNotificationContext } from '../context/PushNotificationContext';
import { trackShare } from '../utils/analytics';

const SUBSCRIBED_KEY = 'havoptic_subscribed';

function getLocalSubscribed(): boolean {
  try {
    return localStorage.getItem(SUBSCRIBED_KEY) === 'true';
  } catch {
    return false;
  }
}

function setLocalSubscribed(): void {
  try {
    localStorage.setItem(SUBSCRIBED_KEY, 'true');
  } catch {
    // localStorage not available
  }
}

export function SettingsDropdown() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const {
    isSubscribed: isPushSubscribed,
    isSupported: isPushSupported,
    permission: pushPermission,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushNotificationContext();

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'already'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isEmailSubscribed = user?.isSubscribed || getLocalSubscribed();

  // Pre-fill email when user logs in
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.alreadySubscribed) {
          setSubmitStatus('already');
        } else {
          setSubmitStatus('success');
          setLocalSubscribed();
        }
        setShowEmailInput(false);
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePushToggle = async () => {
    if (isPushSubscribed) {
      await unsubscribePush();
    } else {
      await subscribePush();
    }
  };

  const handleShare = async () => {
    const shareUrl = 'https://havoptic.com';
    const shareTitle = 'Havoptic - AI Tool Releases';
    const shareText = 'Track the latest releases from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, and more';

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        trackShare('native');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          fallbackCopy(shareUrl);
        }
      }
    } else {
      fallbackCopy(shareUrl);
    }
  };

  const fallbackCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRssClick = () => {
    trackShare('rss');
  };

  // Determine push toggle state
  const showPushToggle = isPushSupported && pushPermission !== 'denied';
  const isPushDenied = pushPermission === 'denied';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
        aria-label="Settings menu"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* User Section */}
          <div className="p-4 border-b border-slate-700">
            {authLoading ? (
              <div className="h-10 animate-pulse bg-slate-700 rounded-lg" />
            ) : user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.github_avatar_url && (
                    <img
                      src={user.github_avatar_url}
                      alt={user.github_username}
                      className="w-10 h-10 rounded-full border border-slate-600"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{user.github_username}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => login()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Sign in with GitHub
              </button>
            )}
          </div>

          {/* Notifications Section */}
          <div className="p-4 border-b border-slate-700">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Notifications</p>

            {/* Email Notifications */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-sm text-slate-300">Email</span>
              </div>
              {isEmailSubscribed || submitStatus === 'success' || submitStatus === 'already' ? (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Subscribed
                </span>
              ) : (
                <button
                  onClick={() => setShowEmailInput(!showEmailInput)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {showEmailInput ? 'Cancel' : 'Enable'}
                </button>
              )}
            </div>

            {/* Email Input Form */}
            {showEmailInput && !isEmailSubscribed && (
              <form onSubmit={handleEmailSubmit} className="mt-2 mb-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    required
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '...' : 'Go'}
                  </button>
                </div>
                {submitStatus === 'error' && (
                  <p className="text-red-400 text-xs mt-1">{errorMessage}</p>
                )}
              </form>
            )}

            {/* Browser Notifications */}
            {showPushToggle && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <span className="text-sm text-slate-300">Browser</span>
                </div>
                {!user ? (
                  <span className="text-xs text-slate-500">Sign in required</span>
                ) : (
                  <button
                    onClick={handlePushToggle}
                    disabled={isPushLoading}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      isPushSubscribed ? 'bg-amber-500' : 'bg-slate-600'
                    } ${isPushLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    aria-label={isPushSubscribed ? 'Disable browser notifications' : 'Enable browser notifications'}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        isPushSubscribed ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>
            )}

            {/* Push denied message */}
            {isPushDenied && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <span className="text-sm text-slate-300">Browser</span>
                </div>
                <span className="text-xs text-slate-500">Blocked in browser</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-2">
            <a
              href="/feed.xml"
              onClick={handleRssClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
              </svg>
              <span className="text-sm">RSS Feed</span>
            </a>
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="text-sm">{copied ? 'Link copied!' : 'Share Havoptic'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

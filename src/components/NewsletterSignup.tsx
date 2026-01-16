import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNewsletterBell } from '../context/NewsletterBellContext';
import { trackShare } from '../utils/analytics';

const DISMISSED_KEY = 'havoptic_signup_dismissed';
const SUBSCRIBED_KEY = 'havoptic_subscribed';

function getIsDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true');
  } catch {
    // localStorage not available
  }
}

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

interface InviteButtonsProps {
  compact?: boolean;
}

function InviteButtons({ compact = false }: InviteButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = 'https://havoptic.com';
  const shareText = 'Stay updated on AI coding tool releases - Claude Code, Cursor, Gemini CLI & more. Check out Havoptic!';
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      trackShare('copy_invite');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = `${shareText}\n${shareUrl}`;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      trackShare('copy_invite');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTwitter = () => {
    trackShare('twitter_invite');
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleLinkedIn = () => {
    trackShare('linkedin_invite');
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleEmail = () => {
    trackShare('email_invite');
    const subject = encodeURIComponent('Check out Havoptic - AI Coding Tool Releases');
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const buttonClass = compact
    ? 'p-2 rounded-md transition-colors'
    : 'p-2.5 rounded-lg transition-colors';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleTwitter}
        className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white`}
        title="Share on X/Twitter"
        aria-label="Share on X/Twitter"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
      <button
        onClick={handleLinkedIn}
        className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white`}
        title="Share on LinkedIn"
        aria-label="Share on LinkedIn"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </button>
      <button
        onClick={handleEmail}
        className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white`}
        title="Share via Email"
        aria-label="Share via Email"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </button>
      <button
        onClick={handleCopy}
        className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white`}
        title={copied ? 'Copied!' : 'Copy invite link'}
        aria-label={copied ? 'Copied!' : 'Copy invite link'}
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

interface NewsletterSignupProps {
  variant?: 'hero' | 'footer';
}

export function NewsletterSignup({ variant = 'hero' }: NewsletterSignupProps) {
  const { user, login, loading: authLoading } = useAuth();
  const { triggerFlyAnimation } = useNewsletterBell();
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isFullyHidden, setIsFullyHidden] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'already'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Check if user is subscribed (from auth or local storage for anonymous users)
  const isSubscribed = user?.isSubscribed || getLocalSubscribed();

  useEffect(() => {
    const dismissed = getIsDismissed();
    setIsFullyHidden(dismissed);
  }, []);

  // Pre-fill email when user logs in
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  const handleDismiss = () => {
    if (panelRef.current && wrapperRef.current) {
      // Get the center position of the panel for the animation start
      const rect = panelRef.current.getBoundingClientRect();
      const startPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      // Set explicit height before collapsing for smooth animation
      const wrapperHeight = wrapperRef.current.offsetHeight;
      wrapperRef.current.style.height = `${wrapperHeight}px`;

      // Start the shrink animation
      setIsAnimatingOut(true);

      // After panel shrinks, trigger the flying bell and start collapse
      setTimeout(() => {
        triggerFlyAnimation(startPos);
        setIsCollapsing(true);

        // Force reflow then animate to 0
        requestAnimationFrame(() => {
          if (wrapperRef.current) {
            wrapperRef.current.style.height = '0px';
          }
        });

        // After collapse animation, fully hide
        setTimeout(() => {
          setDismissed();
          setIsFullyHidden(true);
        }, 400);
      }, 300);
    } else {
      setDismissed();
      setIsFullyHidden(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
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

  // Don't show hero variant if fully hidden
  if (variant === 'hero' && isFullyHidden) {
    return null;
  }

  // Show invite CTA for subscribed users
  if (isSubscribed || submitStatus === 'success' || submitStatus === 'already') {
    if (variant === 'hero') {
      return (
        <div
          ref={wrapperRef}
          className={`overflow-hidden transition-[height,margin,opacity] ease-out ${
            isCollapsing ? 'opacity-0' : ''
          }`}
          style={{ transitionDuration: '400ms' }}
        >
          <div
            ref={panelRef}
            className={`w-full max-w-lg mx-auto bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl p-5 border border-slate-600/50 relative group transition-all duration-300 ${
              isAnimatingOut ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-sm opacity-50 sm:opacity-0 sm:group-hover:opacity-70 hover:!opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:opacity-100"
              aria-label="Close"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pr-6">
              <div className="text-center sm:text-left">
                <p className="text-green-400 font-medium flex items-center gap-2 justify-center sm:justify-start">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  You're subscribed!
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Invite a fellow developer
                </p>
              </div>
              <InviteButtons />
            </div>
          </div>
        </div>
      );
    }

    // Footer variant - more compact
    return (
      <div className="text-center">
        <p className="text-slate-400 text-sm mb-2">
          Enjoying Havoptic? Share with a friend
        </p>
        <div className="flex justify-center">
          <InviteButtons compact />
        </div>
      </div>
    );
  }

  // Show email subscription form
  if (variant === 'hero') {
    return (
      <div
        ref={wrapperRef}
        className={`overflow-hidden transition-[height,margin,opacity] duration-400 ease-out ${
          isCollapsing ? 'opacity-0' : ''
        }`}
        style={{ transitionDuration: '400ms' }}
      >
        <div
          ref={panelRef}
          className={`w-full max-w-lg mx-auto bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl p-5 border border-slate-600/50 relative group transition-all duration-300 ${
            isAnimatingOut ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-sm opacity-50 sm:opacity-0 sm:group-hover:opacity-70 hover:!opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:opacity-100"
            aria-label="Close"
          >
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
          <div className="text-center">
            <p className="text-slate-300 text-sm mb-3">
              Get notified when your favorite AI tools ship new releases
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                required
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            {submitStatus === 'error' && (
              <p className="text-red-400 text-xs mt-2">{errorMessage}</p>
            )}
            {!user && (
              <p className="text-slate-500 text-xs mt-3">
                Or{' '}
                <button
                  onClick={() => login({ subscribe: true })}
                  disabled={authLoading}
                  className="text-slate-400 hover:text-white underline"
                >
                  sign in with GitHub
                </button>
                {' '}to unlock full release history
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Footer variant
  return (
    <div className="w-full max-w-md mx-auto text-center">
      <p className="text-slate-400 text-sm mb-3">
        Get notified when your favorite AI tools ship new releases
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-xs mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          required
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '...' : 'Subscribe'}
        </button>
      </form>
      {submitStatus === 'error' && (
        <p className="text-red-400 text-xs mt-2">{errorMessage}</p>
      )}
    </div>
  );
}

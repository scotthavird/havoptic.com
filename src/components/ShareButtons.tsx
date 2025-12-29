import { useState } from 'react';
import { trackShare } from '../utils/analytics';

interface ShareButtonsProps {
  className?: string;
}

export function ShareButtons({ className = '' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = 'https://havoptic.com';
  const shareTitle = 'Havoptic - AI Tool Releases';
  const shareText = 'Track the latest releases from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, and Kiro CLI';

  const handleShare = async () => {
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
          fallbackCopyLink();
        }
      }
    } else {
      fallbackCopyLink();
    }
  };

  const fallbackCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href="/feed.xml"
        onClick={handleRssClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-orange-400 border border-slate-700 hover:border-orange-400/50 rounded-lg transition-colors"
        title="Subscribe to RSS feed"
        aria-label="Subscribe to RSS feed"
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
        </svg>
        <span className="hidden sm:inline">RSS</span>
      </a>

      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-blue-400 border border-slate-700 hover:border-blue-400/50 rounded-lg transition-colors"
        title={copied ? 'Link copied!' : 'Share this page'}
        aria-label={copied ? 'Link copied to clipboard' : 'Share this page'}
      >
        {copied ? (
          <svg
            className="w-4 h-4 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        )}
        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
      </button>
    </div>
  );
}

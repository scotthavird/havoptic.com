import { useState } from 'react';
import { trackShare } from '../utils/analytics';
import type { Release } from '../types/release';
import { TOOL_CONFIG } from '../types/release';

interface ReleaseShareButtonsProps {
  release: Release;
  className?: string;
}

function buildShareText(release: Release, includeUrl: boolean): string {
  const hashtag = TOOL_CONFIG[release.tool].hashtag;
  const version = `v${release.version}`;

  // Concise, compelling format: emoji + key info + hashtags + optional link
  const base = `🚀 ${release.toolDisplayName} ${version} just dropped!\n\n${hashtag} #AITools`;
  return includeUrl ? `${base}\n\nhavoptic.com/#${release.id}` : base;
}

export function ReleaseShareButtons({ release, className = '' }: ReleaseShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://havoptic.com/#${release.id}`;
  const shareTitle = `${release.toolDisplayName} v${release.version}`;

  const handleTwitterShare = () => {
    // Twitter adds the URL separately, so don't include it in text
    const twitterText = buildShareText(release, false);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    trackShare('twitter');
  };

  const handleLinkedInShare = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    trackShare('linkedin');
  };

  const handleCopyLink = async () => {
    // Copy full share text with URL for easy pasting
    const fullShareText = buildShareText(release, true);
    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopied(true);
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullShareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        // Native share: use text without URL since we pass URL separately
        const nativeShareText = buildShareText(release, false);
        await navigator.share({
          title: shareTitle,
          text: nativeShareText,
          url: shareUrl,
        });
        trackShare('native');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Twitter/X */}
      <button
        onClick={handleTwitterShare}
        className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors rounded"
        title="Share on X/Twitter"
        aria-label={`Share ${shareTitle} on X/Twitter`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* LinkedIn */}
      <button
        onClick={handleLinkedInShare}
        className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors rounded"
        title="Share on LinkedIn"
        aria-label={`Share ${shareTitle} on LinkedIn`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </button>

      {/* Copy Link / Share */}
      <button
        onClick={handleNativeShare}
        className={`p-1.5 transition-colors rounded ${
          copied ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'
        }`}
        title={copied ? 'Copied!' : 'Copy link'}
        aria-label={copied ? 'Link copied' : `Copy link for ${shareTitle}`}
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>
    </div>
  );
}

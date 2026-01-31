import { useState } from 'react';
import { trackShare } from '../utils/analytics';
import type { Release } from '../types/release';
import { TOOL_CONFIG } from '../types/release';

/** Format version with v prefix, avoiding double-v if version already starts with v */
function formatVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
}

interface ReleaseShareButtonsProps {
  release: Release;
  className?: string;
}

/**
 * Get the base URL for sharing - uses current origin to support dev/prod environments
 */
function getShareBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://havoptic.com';
}

/**
 * Get a display-friendly hostname (removes protocol, www prefix)
 */
function getDisplayHost(): string {
  if (typeof window !== 'undefined') {
    return window.location.host.replace(/^www\./, '');
  }
  return 'havoptic.com';
}

function buildShareText(release: Release, includeUrl: boolean): string {
  const hashtag = TOOL_CONFIG[release.tool].hashtag;
  const version = formatVersion(release.version);

  // Concise, compelling format: emoji + key info + hashtags + optional link
  // Use /r/ path for dynamic OG image support
  const base = `🚀 ${release.toolDisplayName} ${version} just dropped!\n\n${hashtag} #aitools`;
  return includeUrl ? `${base}\n\n${getDisplayHost()}/r/${release.id}` : base;
}

export function ReleaseShareButtons({ release, className = '' }: ReleaseShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // Use /r/ path for sharing - enables dynamic OG meta tags
  const shareUrl = `${getShareBaseUrl()}/r/${release.id}`;
  const shareTitle = `${release.toolDisplayName} ${formatVersion(release.version)}`;

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

  const handleSlackShare = () => {
    const slackText = buildShareText(release, false);
    const slackUrl = `https://slack.com/share?text=${encodeURIComponent(slackText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(slackUrl, '_blank', 'noopener,noreferrer');
    trackShare('slack');
  };

  const handleTeamsShare = () => {
    const teamsText = buildShareText(release, false);
    const teamsUrl = `https://teams.microsoft.com/share?href=${encodeURIComponent(shareUrl)}&msgText=${encodeURIComponent(teamsText)}`;
    window.open(teamsUrl, '_blank', 'noopener,noreferrer');
    trackShare('teams');
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

      {/* Slack */}
      <button
        onClick={handleSlackShare}
        className="p-1.5 text-slate-500 hover:text-[#4A154B] transition-colors rounded"
        title="Share on Slack"
        aria-label={`Share ${shareTitle} on Slack`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      </button>

      {/* Microsoft Teams */}
      <button
        onClick={handleTeamsShare}
        className="p-1.5 text-slate-500 hover:text-[#5558AF] transition-colors rounded"
        title="Share on Microsoft Teams"
        aria-label={`Share ${shareTitle} on Microsoft Teams`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.625 8.073c.574 0 1.125.227 1.532.633.406.406.634.957.634 1.532v4.239a3.167 3.167 0 0 1-.927 2.24 3.167 3.167 0 0 1-2.24.927h-.729a5.091 5.091 0 0 1-1.636 2.761 5.091 5.091 0 0 1-3.06 1.306v.001H9.5a5.091 5.091 0 0 1-3.602-1.494A5.092 5.092 0 0 1 4.404 16.5H3.75a2.5 2.5 0 0 1-1.768-.732A2.5 2.5 0 0 1 1.25 14V9.5a2.5 2.5 0 0 1 .732-1.768A2.5 2.5 0 0 1 3.75 7h5.917V5.167a2.917 2.917 0 0 1 .854-2.063 2.917 2.917 0 0 1 2.063-.854h.166a2.917 2.917 0 0 1 2.917 2.917v.354a2.083 2.083 0 0 1 2.958.594c.26.39.4.85.4 1.322 0 .212-.025.423-.073.628h1.673zM16.25 5.167a1.667 1.667 0 0 0-1.667-1.667h-.166A1.667 1.667 0 0 0 12.75 5.167V7h1.417a2.076 2.076 0 0 1 2.083 2.074v5.104a3.833 3.833 0 0 0 2.5-3.595V8.5a.417.417 0 0 0-.417-.417h-2.083V5.167zm-1.667 15.083a3.836 3.836 0 0 0 2.693-1.116 3.835 3.835 0 0 0 1.124-2.717v-.312h-.15a1.917 1.917 0 0 1-1.917-1.917V9.083a.833.833 0 0 0-.833-.833H5a1.25 1.25 0 0 0-1.25 1.25V14A1.25 1.25 0 0 0 5 15.25h.654v1.167a3.838 3.838 0 0 0 3.846 3.833h5.083zm2.292-14.167a.833.833 0 1 0 0-1.666.833.833 0 0 0 0 1.666z" />
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

import { useState, useRef, useCallback } from 'react';
import { TOOL_CONFIG, type Release } from '../types/release';
import { trackReleaseClick, trackOutboundClick, trackInfographicZoom } from '../utils/analytics';
import { ReleaseShareButtons } from './ReleaseShareButtons';
import { ImageZoomModal } from './ImageZoomModal';
import { LazyImage } from './LazyImage';
import { ReleaseInfoFallback } from './ReleaseInfoFallback';

/** Format version with v prefix, avoiding double-v if version already starts with v */
function formatVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
}

interface ReleaseCardProps {
  release: Release;
  isHighlighted?: boolean;
}

export function ReleaseCard({ release, isHighlighted = false }: ReleaseCardProps) {
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [infographicFailed, setInfographicFailed] = useState(false);
  const lastTapTime = useRef<number>(0);
  const config = TOOL_CONFIG[release.tool];
  const infographicUrl = !infographicFailed ? release.infographicUrl : undefined;

  // Double-tap/double-click detection
  const handleImageInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const timeDiff = now - lastTapTime.current;

    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap/click detected - open zoom modal
      e.preventDefault();
      setIsZoomModalOpen(true);
      trackInfographicZoom(release.tool, release.version);
    }
    lastTapTime.current = now;
  }, [release.tool, release.version]);

  return (
    <article
      id={release.id}
      className={`-mx-4 sm:mx-0 bg-slate-800/50 sm:rounded-lg overflow-hidden border-y sm:border transition-all duration-300 ${
        isHighlighted
          ? 'border-blue-400 ring-2 ring-blue-400/50 animate-pulse-subtle'
          : 'border-slate-700 hover:border-slate-600'
      }`}
      aria-label={`${config.displayName} version ${release.version} release`}
    >
      {/* Infographic or fallback info */}
      {infographicUrl ? (
        <div
          className="relative cursor-pointer"
          onClick={handleImageInteraction}
          onTouchEnd={handleImageInteraction}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsZoomModalOpen(true);
            }
          }}
          aria-label="Double-tap or double-click to zoom image"
        >
          <LazyImage
            src={infographicUrl}
            alt={`${config.displayName} ${formatVersion(release.version)} release infographic`}
            className="w-full h-auto"
            onError={() => setInfographicFailed(true)}
          />
        </div>
      ) : (
        <ReleaseInfoFallback release={release} />
      )}

      {/* Zoom modal */}
      {infographicUrl && (
        <ImageZoomModal
          src={infographicUrl}
          alt={`${config.displayName} ${formatVersion(release.version)} release infographic`}
          isOpen={isZoomModalOpen}
          onClose={() => setIsZoomModalOpen(false)}
        />
      )}

      <footer className="flex items-center justify-between p-3 sm:p-4">
        <a
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackReleaseClick(release.tool, release.version, release.url);
            trackOutboundClick(release.url, release.tool);
          }}
          className="inline-flex items-center text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors"
          aria-label={`View ${config.displayName} ${formatVersion(release.version)} release on GitHub`}
        >
          View Release
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <ReleaseShareButtons release={release} />
      </footer>
    </article>
  );
}

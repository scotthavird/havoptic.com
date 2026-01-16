import { useState, useRef, useCallback } from 'react';
import { TOOL_CONFIG, type Release } from '../types/release';
import { trackReleaseClick } from '../utils/analytics';
import { ReleaseShareButtons } from './ReleaseShareButtons';
import { ImageZoomModal } from './ImageZoomModal';

interface ReleaseCardProps {
  release: Release;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  const [showInfographic, setShowInfographic] = useState(!!release.infographicUrl);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const lastTapTime = useRef<number>(0);
  const config = TOOL_CONFIG[release.tool];

  // Double-tap/double-click detection
  const handleImageInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const timeDiff = now - lastTapTime.current;

    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap/click detected - open zoom modal
      e.preventDefault();
      setIsZoomModalOpen(true);
    }
    lastTapTime.current = now;
  }, []);
  const formattedDate = new Date(release.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article
      id={release.id}
      className="bg-slate-800/50 rounded-lg p-3 sm:p-4 border border-slate-700 hover:border-slate-600 transition-colors"
      aria-label={`${config.displayName} version ${release.version} release`}
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${config.bgColor} text-white text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap`}>
            {config.displayName}
          </span>
          <h3 className="text-white font-mono font-semibold text-sm sm:text-base truncate">
            v{release.version}
          </h3>
          <ReleaseShareButtons release={release} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {release.type === 'prerelease' && (
            <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded font-medium">
              PRE
            </span>
          )}
          <time dateTime={release.date} className="text-slate-500 text-xs sm:text-sm whitespace-nowrap">
            {formattedDate}
          </time>
        </div>
      </header>

      <p className="text-slate-300 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-3 sm:line-clamp-2">
        {release.summary || 'No release notes available.'}
      </p>

      {/* Infographic thumbnail */}
      {release.infographicUrl && (
        <div className="mb-3">
          <button
            onClick={() => setShowInfographic(!showInfographic)}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {showInfographic ? 'Hide' : 'View'} Infographic
            <svg className={`w-3 h-3 transition-transform ${showInfographic ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showInfographic && (
            <div className="mt-2 rounded-lg overflow-hidden border border-slate-600">
              <div
                className="relative cursor-pointer group"
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
                <img
                  src={release.infographicUrl}
                  alt={`${config.displayName} v${release.version} release infographic`}
                  className="w-full h-auto"
                  loading="lazy"
                />
                {/* Zoom hint overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <span className="text-white text-xs bg-black/60 px-2 py-1 rounded hidden sm:block">
                    Double-click to zoom
                  </span>
                  <span className="text-white text-xs bg-black/60 px-2 py-1 rounded sm:hidden">
                    Double-tap to zoom
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Zoom modal */}
          {release.infographicUrl && (
            <ImageZoomModal
              src={release.infographicUrl}
              alt={`${config.displayName} v${release.version} release infographic`}
              isOpen={isZoomModalOpen}
              onClose={() => setIsZoomModalOpen(false)}
            />
          )}
        </div>
      )}

      <footer>
        <a
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackReleaseClick(release.tool, release.version, release.url)}
          className="inline-flex items-center text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors"
          aria-label={`View ${config.displayName} v${release.version} release on GitHub`}
        >
          View Release
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </footer>
    </article>
  );
}

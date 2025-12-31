import { useState } from 'react';
import { TOOL_CONFIG, type Release } from '../types/release';
import { trackReleaseClick } from '../utils/analytics';
import { ReleaseShareButtons } from './ReleaseShareButtons';

interface ReleaseCardProps {
  release: Release;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  const [showInfographic, setShowInfographic] = useState(false);
  const config = TOOL_CONFIG[release.tool];
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
              <img
                src={release.infographicUrl}
                alt={`${config.displayName} v${release.version} release infographic`}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}

      <footer className="flex items-center justify-between">
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

        <ReleaseShareButtons release={release} />
      </footer>
    </article>
  );
}

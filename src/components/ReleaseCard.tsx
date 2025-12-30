import { TOOL_CONFIG, type Release } from '../types/release';
import { trackReleaseClick } from '../utils/analytics';

interface ReleaseCardProps {
  release: Release;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  const config = TOOL_CONFIG[release.tool];
  const formattedDate = new Date(release.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article
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
    </article>
  );
}

import { TOOL_CONFIG, type Release } from '../types/release';

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
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className={`${config.bgColor} text-white text-xs font-medium px-2.5 py-1 rounded-full`}>
            {config.displayName}
          </span>
          <span className="text-white font-mono font-semibold">
            v{release.version}
          </span>
          {release.type === 'prerelease' && (
            <span className="text-xs text-yellow-500 font-medium">
              pre-release
            </span>
          )}
        </div>
        <span className="text-slate-500 text-sm whitespace-nowrap">
          {formattedDate}
        </span>
      </div>

      <p className="text-slate-300 text-sm mb-3 line-clamp-2">
        {release.summary || 'No release notes available.'}
      </p>

      <a
        href={release.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        View Release
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

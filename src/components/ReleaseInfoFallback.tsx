import { TOOL_CONFIG, type Release } from '../types/release';

/** Format version with v prefix, avoiding double-v if version already starts with v */
function formatVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
}

/** Format date to a readable string */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Parse release notes into bullet points */
function parseNotes(notes: string): string[] {
  // Split by common patterns: "- ", newlines followed by "- ", or " - "
  const items = notes
    .split(/(?:^|\n)\s*-\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  // If no bullet points found, try splitting by sentences
  if (items.length <= 1 && notes.length > 100) {
    return notes
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 6);
  }

  return items.slice(0, 6); // Limit to 6 items
}

interface ReleaseInfoFallbackProps {
  release: Release;
}

export function ReleaseInfoFallback({ release }: ReleaseInfoFallbackProps) {
  const config = TOOL_CONFIG[release.tool];
  const notes = release.fullNotes || release.summary;
  const bulletPoints = parseNotes(notes);

  return (
    <div className="p-4 sm:p-6">
      {/* Header with tool name and version */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className={`text-xl sm:text-2xl font-bold ${config.color}`}>
            {config.displayName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white font-semibold text-lg">
              {formatVersion(release.version)}
            </span>
            <span className="text-slate-400 text-sm">
              {formatDate(release.date)}
            </span>
          </div>
        </div>
        {/* Tool badge */}
        <span
          className={`${config.bgColor} text-white text-xs font-medium px-2.5 py-1 rounded-full shrink-0`}
        >
          {release.type === 'prerelease' ? 'Pre-release' : 'Release'}
        </span>
      </div>

      {/* Release notes */}
      {bulletPoints.length > 0 ? (
        <ul className="space-y-2">
          {bulletPoints.map((point, index) => (
            <li key={index} className="flex gap-2 text-sm text-slate-300">
              <span className={`${config.color} shrink-0 mt-1`}>•</span>
              <span className="leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-400 text-sm italic">
          No release notes available.
        </p>
      )}
    </div>
  );
}

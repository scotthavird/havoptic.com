import type { Release } from '../types/release';
import { ReleaseCard } from './ReleaseCard';

interface GroupedReleases {
  year: number;
  months: {
    month: number;
    monthName: string;
    releases: Release[];
  }[];
}

interface TimelineProps {
  groupedReleases: GroupedReleases[];
}

export function Timeline({ groupedReleases }: TimelineProps) {
  if (groupedReleases.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No releases found. Run the fetch script to populate data.
      </div>
    );
  }

  // Track rendered IDs to prevent duplicates at render time
  const renderedIds = new Set<string>();

  return (
    <section aria-label="Release timeline">
      {groupedReleases.map(({ year, months }) => (
        <section key={year} className="mb-6 sm:mb-8" aria-label={`${year} releases`}>
          {/* Year header */}
          <header className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{year}</h2>
          </header>

          {months.map(({ month, monthName, releases }) => {
            // Filter out any duplicates that might have slipped through
            const uniqueReleases = releases.filter(r => {
              if (renderedIds.has(r.id)) return false;
              renderedIds.add(r.id);
              return true;
            });

            if (uniqueReleases.length === 0) return null;

            return (
              <div key={`${year}-${month}`} className="mb-4 sm:mb-6" role="group" aria-label={`${monthName} ${year} releases`}>
                {/* Month label */}
                <div className="mb-3">
                  <span className="text-xs sm:text-sm font-medium text-slate-400">
                    {monthName}
                  </span>
                </div>

                {/* Release cards */}
                <div className="space-y-3 sm:space-y-4">
                  {uniqueReleases.map((release) => (
                    <ReleaseCard key={release.id} release={release} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </section>
  );
}

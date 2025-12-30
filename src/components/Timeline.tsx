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
    <section className="relative" aria-label="Release timeline">
      {/* Vertical line */}
      <div className="absolute left-[60px] top-0 bottom-0 w-px bg-slate-700 hidden md:block" aria-hidden="true" />

      {groupedReleases.map(({ year, months }) => (
        <section key={year} className="mb-6 sm:mb-8" aria-label={`${year} releases`}>
          {/* Year header */}
          <header className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-auto md:w-[120px] flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{year}</h2>
            </div>
            <div className="h-px bg-slate-700 flex-grow" aria-hidden="true" />
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
                {/* Month label - stacked on mobile, side by side on desktop */}
                <div className="md:flex md:gap-8">
                  <div className="w-auto md:w-[120px] flex-shrink-0 relative mb-2 md:mb-0">
                    <span className="text-xs sm:text-sm font-medium text-slate-400 md:sticky md:top-4">
                      {monthName}
                    </span>
                    {/* Dot on timeline */}
                    <div className="absolute right-[-8px] top-1.5 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-800 hidden md:block" aria-hidden="true" />
                  </div>

                  {/* Release cards */}
                  <div className="flex-grow space-y-3 sm:space-y-4">
                    {uniqueReleases.map((release) => (
                      <ReleaseCard key={release.id} release={release} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </section>
  );
}

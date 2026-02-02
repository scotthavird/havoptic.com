import type { Release, ToolId } from '../types/release';
import { ReleaseCard } from './ReleaseCard';
import { PushInlinePrompt } from './PushInlinePrompt';

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
  highlightedReleaseId?: string | null;
  /** The currently selected tool filter */
  selectedTool?: ToolId | 'all' | 'watching';
}

export function Timeline({ groupedReleases, highlightedReleaseId, selectedTool }: TimelineProps) {
  if (groupedReleases.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No releases found. Run the fetch script to populate data.
      </div>
    );
  }

  // Track rendered IDs to prevent duplicates at render time
  const renderedIds = new Set<string>();
  // Track total releases rendered to insert inline prompt at right position
  let totalReleasesRendered = 0;
  const PROMPT_AFTER_RELEASE = 3; // Show prompt after 3rd release

  // Determine tool context for the prompt
  const promptToolId = selectedTool && selectedTool !== 'all' && selectedTool !== 'watching'
    ? selectedTool
    : null;

  // Get current year/month to hide headers for the most recent period
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  return (
    <section aria-label="Release timeline">
      {groupedReleases.map(({ year, months }, yearIndex) => {
        const isCurrentYear = year === currentYear;
        const isFirstYear = yearIndex === 0;
        // Hide year header only for the first year group if it's the current year
        const showYearHeader = !(isFirstYear && isCurrentYear);

        return (
          <section key={year} className="mb-3 sm:mb-4" aria-label={`${year} releases`}>
            {/* Year header - hidden for current year at the top */}
            {showYearHeader && (
              <header className="mb-2 sm:mb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{year}</h2>
              </header>
            )}

            {months.map(({ month, monthName, releases }, monthIndex) => {
              // Filter out any duplicates that might have slipped through
              const uniqueReleases = releases.filter(r => {
                if (renderedIds.has(r.id)) return false;
                renderedIds.add(r.id);
                return true;
              });

              if (uniqueReleases.length === 0) return null;

              // Hide month header only for the first month of the first year if it's current
              const isCurrentMonth = isCurrentYear && month === currentMonth;
              const isFirstMonth = isFirstYear && monthIndex === 0;
              const showMonthHeader = !(isFirstMonth && isCurrentMonth);

              return (
                <div key={`${year}-${month}`} className="mb-2 sm:mb-3" role="group" aria-label={`${monthName} ${year} releases`}>
                  {/* Month label - hidden for current month at the top */}
                  {showMonthHeader && (
                    <div className="mb-1.5">
                      <span className="text-xs sm:text-sm font-medium text-slate-400">
                        {monthName}
                      </span>
                    </div>
                  )}

                  {/* Release cards */}
                  <div className="space-y-3 sm:space-y-4">
                    {uniqueReleases.map((release) => {
                      totalReleasesRendered++;
                      const showPromptAfterThis = totalReleasesRendered === PROMPT_AFTER_RELEASE;

                      return (
                        <div key={release.id}>
                          <ReleaseCard
                            release={release}
                            isHighlighted={release.id === highlightedReleaseId}
                          />
                          {showPromptAfterThis && (
                            <div className="mt-3 sm:mt-4">
                              <PushInlinePrompt toolId={promptToolId} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </section>
  );
}

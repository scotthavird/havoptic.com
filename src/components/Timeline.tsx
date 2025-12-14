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

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[60px] top-0 bottom-0 w-px bg-slate-700 hidden md:block" />

      {groupedReleases.map(({ year, months }) => (
        <div key={year} className="mb-8">
          {/* Year header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-[60px] md:w-[120px] flex-shrink-0">
              <span className="text-2xl font-bold text-white">{year}</span>
            </div>
            <div className="h-px bg-slate-700 flex-grow" />
          </div>

          {months.map(({ month, monthName, releases }) => (
            <div key={`${year}-${month}`} className="flex gap-4 md:gap-8 mb-6">
              {/* Month label */}
              <div className="w-[60px] md:w-[120px] flex-shrink-0 relative">
                <span className="text-sm font-medium text-slate-400 sticky top-4">
                  {monthName}
                </span>
                {/* Dot on timeline */}
                <div className="absolute right-[-8px] top-1.5 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-800 hidden md:block" />
              </div>

              {/* Release cards */}
              <div className="flex-grow space-y-4">
                {releases.map((release) => (
                  <ReleaseCard key={release.id} release={release} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Release, ReleasesData, ToolId } from '../types/release';

interface GroupedReleases {
  year: number;
  months: {
    month: number;
    monthName: string;
    releases: Release[];
  }[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function useReleases(selectedTool: ToolId | 'all') {
  const [data, setData] = useState<ReleasesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double-fetch in React Strict Mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchReleases() {
      try {
        const response = await fetch('/data/releases.json', {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch releases');
        }
        const json: ReleasesData = await response.json();

        // Deduplicate releases by id (safety net)
        const seen = new Set<string>();
        const uniqueReleases = json.releases.filter(r => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

        setData({ lastUpdated: json.lastUpdated, releases: uniqueReleases });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchReleases();
  }, []);

  const filteredReleases = useMemo(() => {
    if (!data) return [];
    if (selectedTool === 'all') return data.releases;
    return data.releases.filter(r => r.tool === selectedTool);
  }, [data, selectedTool]);

  const groupedReleases = useMemo((): GroupedReleases[] => {
    const groups: Map<number, Map<number, Release[]>> = new Map();

    for (const release of filteredReleases) {
      const date = new Date(release.date);
      const year = date.getFullYear();
      const month = date.getMonth();

      if (!groups.has(year)) {
        groups.set(year, new Map());
      }
      const yearMap = groups.get(year)!;
      if (!yearMap.has(month)) {
        yearMap.set(month, []);
      }
      yearMap.get(month)!.push(release);
    }

    const result: GroupedReleases[] = [];
    const sortedYears = Array.from(groups.keys()).sort((a, b) => b - a);

    for (const year of sortedYears) {
      const yearMap = groups.get(year)!;
      const sortedMonths = Array.from(yearMap.keys()).sort((a, b) => b - a);
      const months = sortedMonths.map(month => ({
        month,
        monthName: MONTH_NAMES[month],
        releases: yearMap.get(month)!.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      }));
      result.push({ year, months });
    }

    return result;
  }, [filteredReleases]);

  return {
    releases: filteredReleases,
    groupedReleases,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error,
  };
}

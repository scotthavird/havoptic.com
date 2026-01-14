import { useState, useEffect, useMemo } from 'react';
import type { Release, ReleasesData, ToolId } from '../types/release';
import { useAuth } from '../context/AuthContext';

interface GroupedReleases {
  year: number;
  months: {
    month: number;
    monthName: string;
    releases: Release[];
  }[];
}

interface GatedReleasesData extends ReleasesData {
  _limited?: boolean;
  _message?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function useReleases(selectedTool: ToolId | 'all') {
  const { user } = useAuth();
  const [data, setData] = useState<GatedReleasesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReleases() {
      try {
        // Use gated API endpoint instead of static file
        const response = await fetch('/api/releases', {
          cache: 'no-store',
          signal: controller.signal,
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch releases');
        }
        const json: GatedReleasesData = await response.json();

        // Deduplicate releases by id (safety net)
        const seen = new Set<string>();
        const uniqueReleases = json.releases.filter(r => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

        setData({
          lastUpdated: json.lastUpdated,
          releases: uniqueReleases,
          _limited: json._limited,
          _message: json._message,
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    fetchReleases();

    return () => controller.abort();
  }, [user]); // Re-fetch when user changes (login/logout)

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
    isLimited: data?._limited ?? false,
    limitedMessage: data?._message ?? null,
  };
}

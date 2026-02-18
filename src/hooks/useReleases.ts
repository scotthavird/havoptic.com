import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Release, ReleasesData, ToolId } from '../types/release';
import { useAuth } from '../context/AuthContext';

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (response.status >= 500 && attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      continue;
    }
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  throw new Error('Failed to fetch after retries');
}

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

// Module-level cache: survives component unmount/remount (e.g. navigating away and back)
let cachedData: GatedReleasesData | null = null;
let cachedForUser: string | null = null;

function deduplicateReleases(json: GatedReleasesData): GatedReleasesData {
  const seen = new Set<string>();
  const uniqueReleases = json.releases.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  return {
    lastUpdated: json.lastUpdated,
    releases: uniqueReleases,
    _limited: json._limited,
    _message: json._message,
  };
}

export function useReleases(selectedTool: ToolId | 'all') {
  const { user } = useAuth();
  const userKey = user?.id ?? '__anon__';
  const hasCachedData = cachedData !== null && cachedForUser === userKey;

  const [data, setData] = useState<GatedReleasesData | null>(hasCachedData ? cachedData : null);
  const [loading, setLoading] = useState(!hasCachedData);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReleases() {
      try {
        // Bypass SW cache to guarantee fresh data from the network
        const response = await fetchWithRetry(
          '/api/releases?_sw=bypass',
          {
            cache: 'no-store',
            signal: controller.signal,
            credentials: 'include',
          },
          3
        );
        const json: GatedReleasesData = await response.json();
        const fresh = deduplicateReleases(json);

        // Only update state if data actually changed
        if (!cachedData || cachedData.lastUpdated !== fresh.lastUpdated) {
          cachedData = fresh;
          cachedForUser = userKey;
          setData(fresh);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        // If we have cached data, silently keep showing it
        if (!cachedData) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    }

    // Invalidate cache on auth change
    if (cachedForUser !== userKey) {
      cachedData = null;
      cachedForUser = null;
      setData(null);
      setLoading(true);
    }

    fetchReleases();

    return () => controller.abort();
  }, [user, userKey]); // Re-fetch when user changes (login/logout)

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetchWithRetry(
        '/api/releases?_sw=bypass',
        { cache: 'no-store', credentials: 'include' },
        3
      );
      const json: GatedReleasesData = await response.json();
      const fresh = deduplicateReleases(json);
      cachedData = fresh;
      cachedForUser = userKey;
      setData(fresh);
    } catch {
      // Silently keep showing existing data on refresh failure
    } finally {
      setRefreshing(false);
    }
  }, [userKey]);

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
    refresh,
    refreshing,
  };
}

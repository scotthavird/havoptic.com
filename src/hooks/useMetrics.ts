import { useState, useEffect, useMemo } from 'react';
import type { ToolId } from '../types/release';
import type {
  MetricsData,
  VelocityData,
  FeatureMatrixData,
  ToolMetrics,
  VelocityMetrics,
} from '../types/metrics';

export function useGitHubStats() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const response = await fetch('/data/metrics/github-stats.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch GitHub stats');
        }
        const json: MetricsData = await response.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();

    return () => controller.abort();
  }, []);

  const getToolStats = (toolId: ToolId): ToolMetrics | null => {
    return data?.tools?.[toolId] ?? null;
  };

  return {
    stats: data?.tools ?? {},
    getToolStats,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error,
  };
}

export function useNpmDownloads() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const response = await fetch('/data/metrics/npm-downloads.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch npm downloads');
        }
        const json: MetricsData = await response.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();

    return () => controller.abort();
  }, []);

  const getToolStats = (toolId: ToolId): ToolMetrics | null => {
    return data?.tools?.[toolId] ?? null;
  };

  return {
    stats: data?.tools ?? {},
    getToolStats,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error,
  };
}

export function useVelocityMetrics() {
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const response = await fetch('/data/metrics/velocity.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch velocity metrics');
        }
        const json: VelocityData = await response.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();

    return () => controller.abort();
  }, []);

  const getToolVelocity = (toolId: ToolId): VelocityMetrics | null => {
    return data?.tools?.[toolId] ?? null;
  };

  // Rank tools by velocity (releases this month)
  const velocityRanking = useMemo(() => {
    if (!data?.tools) return [];

    return Object.entries(data.tools)
      .map(([id, metrics]) => ({
        ...metrics,
        toolId: id as ToolId,
      }))
      .sort((a, b) => b.releasesThisMonth - a.releasesThisMonth);
  }, [data]);

  return {
    metrics: data?.tools ?? {},
    getToolVelocity,
    velocityRanking,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error,
  };
}

export function useFeatureMatrix() {
  const [data, setData] = useState<FeatureMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMatrix() {
      try {
        const response = await fetch('/data/feature-matrix.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch feature matrix');
        }
        const json: FeatureMatrixData = await response.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchMatrix();

    return () => controller.abort();
  }, []);

  // Get features grouped by category
  const featuresByCategory = useMemo(() => {
    if (!data?.features || !data?.categories) return {};

    const grouped: Record<string, typeof data.features> = {};
    for (const category of data.categories) {
      grouped[category.id] = data.features.filter((f) => f.categoryId === category.id);
    }
    return grouped;
  }, [data]);

  // Compare two tools
  const compareTools = (tool1: ToolId, tool2: ToolId) => {
    if (!data?.features) return { tool1Only: [], tool2Only: [], both: [], neither: [] };

    const result = {
      tool1Only: [] as typeof data.features,
      tool2Only: [] as typeof data.features,
      both: [] as typeof data.features,
      neither: [] as typeof data.features,
    };

    for (const feature of data.features) {
      const t1 = feature.tools[tool1]?.supported ?? false;
      const t2 = feature.tools[tool2]?.supported ?? false;

      if (t1 && t2) result.both.push(feature);
      else if (t1) result.tool1Only.push(feature);
      else if (t2) result.tool2Only.push(feature);
      else result.neither.push(feature);
    }

    return result;
  };

  // Count supported features per tool
  const featureCountByTool = useMemo((): Record<ToolId, number> => {
    const counts: Record<ToolId, number> = {
      'claude-code': 0,
      'openai-codex': 0,
      'cursor': 0,
      'gemini-cli': 0,
      'kiro': 0,
      'github-copilot': 0,
    };

    if (!data?.features) return counts;

    for (const feature of data.features) {
      for (const toolId of Object.keys(counts) as ToolId[]) {
        if (feature.tools[toolId]?.supported) {
          counts[toolId]++;
        }
      }
    }

    return counts;
  }, [data]);

  return {
    categories: data?.categories ?? [],
    features: data?.features ?? [],
    featuresByCategory,
    compareTools,
    featureCountByTool,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error,
  };
}

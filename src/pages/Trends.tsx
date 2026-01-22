import { useMemo } from 'react';
import { useGitHubStats, useNpmDownloads, useVelocityMetrics } from '../hooks/useMetrics';
import { usePageMeta, PAGE_META } from '../hooks/usePageMeta';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { getAllToolIds } from '../utils/toolRegistry';
import type { ToolMetrics, VelocityMetrics } from '../types/metrics';

const TOOL_IDS: ToolId[] = getAllToolIds();

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) return null;
  const isPositive = trend > 0;
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      }`}
    >
      {isPositive ? '+' : ''}{trend.toFixed(1)}%
    </span>
  );
}

interface BarChartProps {
  data: { toolId: ToolId; value: number; label?: string }[];
  title: string;
  subtitle?: string;
  formatValue?: (v: number) => string;
}

function BarChart({ data, title, subtitle, formatValue = formatNumber }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}
      <div className="space-y-3">
        {data.map(({ toolId, value, label }) => {
          const config = TOOL_CONFIG[toolId];
          const percentage = (value / maxValue) * 100;
          return (
            <div key={toolId} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-300">{config.displayName}</span>
                <span className="text-sm font-medium text-white">
                  {label || formatValue(value)}
                </span>
              </div>
              <div className="h-6 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.bgColor} rounded-full transition-all duration-500 ease-out group-hover:brightness-110`}
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: string;
}

function StatCard({ title, value, subtitle, trend, icon }: StatCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && <TrendBadge trend={trend} />}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{title}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

export function Trends() {
  usePageMeta(PAGE_META.trends);

  const { stats: githubStats, loading: githubLoading } = useGitHubStats();
  const { stats: npmStats, loading: npmLoading } = useNpmDownloads();
  const { metrics: velocityMetrics, loading: velocityLoading } = useVelocityMetrics();

  const loading = githubLoading || npmLoading || velocityLoading;

  // Helper to safely get stats
  const getGithubStats = (id: ToolId): ToolMetrics | undefined => {
    return (githubStats as Record<ToolId, ToolMetrics>)[id];
  };

  const getNpmStats = (id: ToolId): ToolMetrics | undefined => {
    return (npmStats as Record<ToolId, ToolMetrics>)[id];
  };

  const getVelocity = (id: ToolId): VelocityMetrics | undefined => {
    return (velocityMetrics as Record<ToolId, VelocityMetrics>)[id];
  };

  // Prepare data for charts
  const starsData = useMemo(() => {
    return TOOL_IDS
      .filter((id) => getGithubStats(id)?.github?.stars)
      .map((id) => ({
        toolId: id,
        value: getGithubStats(id)?.github?.stars || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [githubStats]);

  const downloadsData = useMemo(() => {
    return TOOL_IDS
      .filter((id) => getNpmStats(id)?.npm?.weeklyDownloads)
      .map((id) => ({
        toolId: id,
        value: getNpmStats(id)?.npm?.weeklyDownloads || 0,
        trend: getNpmStats(id)?.npm?.downloadsTrend || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [npmStats]);

  const velocityData = useMemo(() => {
    return TOOL_IDS
      .filter((id) => getVelocity(id))
      .map((id) => ({
        toolId: id,
        value: getVelocity(id)?.releasesThisMonth || 0,
        label: `${getVelocity(id)?.releasesThisMonth || 0} releases`,
      }))
      .sort((a, b) => b.value - a.value);
  }, [velocityMetrics]);

  const avgDaysData = useMemo(() => {
    return TOOL_IDS
      .filter((id) => getVelocity(id)?.averageDaysBetweenReleases)
      .map((id) => ({
        toolId: id,
        value: getVelocity(id)?.averageDaysBetweenReleases || 0,
        label: `${getVelocity(id)?.averageDaysBetweenReleases?.toFixed(1) || 0} days`,
      }))
      .sort((a, b) => a.value - b.value); // Lower is better
  }, [velocityMetrics]);

  // Summary stats
  const totalStars = useMemo(() => {
    const statsArray = Object.values(githubStats) as ToolMetrics[];
    return statsArray.reduce((sum, s) => sum + (s?.github?.stars || 0), 0);
  }, [githubStats]);

  const totalWeeklyDownloads = useMemo(() => {
    const statsArray = Object.values(npmStats) as ToolMetrics[];
    return statsArray.reduce((sum, s) => sum + (s?.npm?.weeklyDownloads || 0), 0);
  }, [npmStats]);

  const totalReleasesThisMonth = useMemo(() => {
    const metricsArray = Object.values(velocityMetrics) as VelocityMetrics[];
    return metricsArray.reduce((sum, m) => sum + (m?.releasesThisMonth || 0), 0);
  }, [velocityMetrics]);

  const fastestReleaser = useMemo(() => {
    const sorted = [...velocityData].sort((a, b) => b.value - a.value);
    return sorted[0]?.toolId ? TOOL_CONFIG[sorted[0].toolId].displayName : '-';
  }, [velocityData]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-center py-12 text-slate-400">Loading trends data...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <a
        href="#/"
        className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back to Timeline
      </a>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Trends & Insights</h1>
        <p className="text-slate-400">
          Compare growth, popularity, and release velocity across AI coding tools
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="⭐"
          title="Total GitHub Stars"
          value={formatNumber(totalStars)}
          subtitle="Across all tracked tools"
        />
        <StatCard
          icon="📦"
          title="Weekly Downloads"
          value={formatNumber(totalWeeklyDownloads)}
          subtitle="npm packages combined"
        />
        <StatCard
          icon="🚀"
          title="Releases This Month"
          value={totalReleasesThisMonth}
          subtitle="All tools combined"
        />
        <StatCard
          icon="🏆"
          title="Most Active"
          value={fastestReleaser}
          subtitle="By releases this month"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {starsData.length > 0 && (
          <BarChart
            data={starsData}
            title="GitHub Stars"
            subtitle="Total stars by repository"
          />
        )}

        {downloadsData.length > 0 && (
          <BarChart
            data={downloadsData}
            title="Weekly Downloads"
            subtitle="npm package downloads"
          />
        )}

        {velocityData.length > 0 && (
          <BarChart
            data={velocityData}
            title="Release Velocity"
            subtitle="Releases in the past month"
            formatValue={(v) => `${v} releases`}
          />
        )}

        {avgDaysData.length > 0 && (
          <BarChart
            data={avgDaysData}
            title="Release Frequency"
            subtitle="Average days between releases (lower = faster)"
            formatValue={(v) => `${v.toFixed(1)} days`}
          />
        )}
      </div>

      {/* Download Trends Table */}
      {downloadsData.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Download Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Tool</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Weekly</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Monthly</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {downloadsData.map(({ toolId }) => {
                  const config = TOOL_CONFIG[toolId];
                  const npm = getNpmStats(toolId)?.npm;
                  if (!npm) return null;
                  return (
                    <tr key={toolId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <span className={`font-medium ${config.color}`}>{config.displayName}</span>
                      </td>
                      <td className="text-right py-3 px-4 text-white">
                        {formatNumber(npm.weeklyDownloads)}
                      </td>
                      <td className="text-right py-3 px-4 text-white">
                        {formatNumber(npm.monthlyDownloads)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <TrendBadge trend={npm.downloadsTrend} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Velocity Details */}
      {velocityData.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Release Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Tool</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">This Week</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">This Month</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">This Quarter</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Avg. Days</th>
                </tr>
              </thead>
              <tbody>
                {velocityData.map(({ toolId }) => {
                  const config = TOOL_CONFIG[toolId];
                  const velocity = getVelocity(toolId);
                  if (!velocity) return null;
                  return (
                    <tr key={toolId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <span className={`font-medium ${config.color}`}>{config.displayName}</span>
                      </td>
                      <td className="text-right py-3 px-4 text-white">{velocity.releasesThisWeek}</td>
                      <td className="text-right py-3 px-4 text-white">{velocity.releasesThisMonth}</td>
                      <td className="text-right py-3 px-4 text-white">{velocity.releasesThisQuarter}</td>
                      <td className="text-right py-3 px-4 text-white">
                        {velocity.averageDaysBetweenReleases.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { TOOL_CONFIG, type ToolId, type Release } from '../types/release';

interface ReleaseHistoryChartProps {
  releases: Release[];
  toolId: ToolId;
}

interface MonthData {
  month: string;
  label: string;
  count: number;
  releases: Release[];
}

export function ReleaseHistoryChart({ releases, toolId }: ReleaseHistoryChartProps) {
  const config = TOOL_CONFIG[toolId];

  const chartData = useMemo(() => {
    if (releases.length === 0) return [];

    // Sort releases by date
    const sortedReleases = [...releases].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Get date range
    const firstDate = new Date(sortedReleases[0].date);
    const lastDate = new Date(sortedReleases[sortedReleases.length - 1].date);

    // Generate all months in range
    const months: MonthData[] = [];
    const current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const end = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);

    while (current < end) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      // Find releases in this month
      const monthReleases = sortedReleases.filter((r) => {
        const releaseDate = new Date(r.date);
        return (
          releaseDate.getFullYear() === current.getFullYear() &&
          releaseDate.getMonth() === current.getMonth()
        );
      });

      months.push({
        month: monthKey,
        label,
        count: monthReleases.length,
        releases: monthReleases,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }, [releases]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const counts = chartData.map((m) => m.count);
    const totalReleases = counts.reduce((a, b) => a + b, 0);
    const maxMonth = chartData.reduce((max, m) => (m.count > max.count ? m : max), chartData[0]);
    const avgPerMonth = totalReleases / chartData.length;

    // Find busiest period (3-month window)
    let busiestPeriod = { start: '', end: '', count: 0 };
    for (let i = 0; i < chartData.length - 2; i++) {
      const windowCount = chartData[i].count + chartData[i + 1].count + chartData[i + 2].count;
      if (windowCount > busiestPeriod.count) {
        busiestPeriod = {
          start: chartData[i].label,
          end: chartData[i + 2].label,
          count: windowCount,
        };
      }
    }

    return {
      totalMonths: chartData.length,
      totalReleases,
      maxMonth,
      avgPerMonth,
      busiestPeriod,
    };
  }, [chartData]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map((m) => m.count), 1);
  }, [chartData]);

  if (chartData.length === 0) {
    return null;
  }

  const chartHeight = 120;
  const barWidth = Math.max(8, Math.min(20, 800 / chartData.length));

  // Color mapping
  const colorMap: Record<string, string> = {
    'bg-claude': '#D97706',
    'bg-codex': '#059669',
    'bg-cursor': '#7C3AED',
    'bg-gemini': '#00ACC1',
    'bg-kiro': '#8B5CF6',
    'bg-copilot': '#8534F3',
    'bg-aider': '#22c55e',
    'bg-windsurf': '#00D4AA',
  };
  const fill = colorMap[config.bgColor] || '#6B7280';

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-1">Release History</h3>
      <p className="text-sm text-slate-400 mb-4">
        {stats?.totalReleases} releases tracked over {stats?.totalMonths} months
      </p>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-xl font-bold ${config.color}`}>{stats.avgPerMonth.toFixed(1)}</div>
            <div className="text-xs text-slate-500">avg/month</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${config.color}`}>{stats.maxMonth.count}</div>
            <div className="text-xs text-slate-500">peak ({stats.maxMonth.label})</div>
          </div>
          {stats.busiestPeriod.count > 0 && (
            <div className="text-center">
              <div className={`text-xl font-bold ${config.color}`}>{stats.busiestPeriod.count}</div>
              <div className="text-xs text-slate-500">
                busiest 3mo ({stats.busiestPeriod.start}-{stats.busiestPeriod.end})
              </div>
            </div>
          )}
        </div>
      )}

      {/* SVG Chart */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartData.length * (barWidth + 4)} ${chartHeight + 30}`}
          className="w-full h-auto min-w-[300px]"
          preserveAspectRatio="xMinYMid meet"
        >
          {/* Bars */}
          {chartData.map((month, index) => {
            const barHeight = (month.count / maxValue) * chartHeight;
            const x = index * (barWidth + 4);
            const y = chartHeight - barHeight;

            return (
              <g key={month.month}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight || 2}
                  fill={month.count > 0 ? fill : 'rgba(148, 163, 184, 0.2)'}
                  rx="2"
                  className="transition-all duration-200 hover:brightness-125"
                />
                {month.count > 0 && barHeight > 15 && (
                  <text
                    x={x + barWidth / 2}
                    y={y + barHeight / 2 + 4}
                    fill="white"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-medium"
                  >
                    {month.count}
                  </text>
                )}
                {/* Show label for every 3rd month or if it's a peak */}
                {(index % 3 === 0 || month === stats?.maxMonth) && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 15}
                    fill="rgba(148, 163, 184, 0.6)"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {month.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Timeline dots for major releases */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Major Versions</h4>
        <div className="flex flex-wrap gap-2">
          {releases
            .filter((r) => {
              // Show major versions (x.0.0 or x.0)
              const version = r.version.replace(/^v/, '');
              return /^\d+\.0(\.0)?$/.test(version) || /^\d+\.0$/.test(version);
            })
            .slice(0, 6)
            .map((release) => (
              <a
                key={release.id}
                href={release.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-2 py-1 rounded text-xs ${config.bgColor} text-white hover:brightness-110 transition-all`}
              >
                v{release.version.replace(/^v/, '')}
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}

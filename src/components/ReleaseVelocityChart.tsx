import { useMemo } from 'react';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import type { Release } from '../types/release';

interface ReleaseVelocityChartProps {
  releases: Release[];
  selectedTools: ToolId[];
  months?: number;
}

interface MonthData {
  month: string; // YYYY-MM
  label: string; // "Jan 2025"
  counts: Record<ToolId, number>;
}

export function ReleaseVelocityChart({ releases, selectedTools, months = 6 }: ReleaseVelocityChartProps) {
  const chartData = useMemo(() => {
    // Generate last N months
    const now = new Date();
    const monthsData: MonthData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const counts = {} as Record<ToolId, number>;
      for (const toolId of selectedTools) {
        counts[toolId] = 0;
      }

      monthsData.push({ month: monthKey, label, counts });
    }

    // Count releases per tool per month
    for (const release of releases) {
      if (!selectedTools.includes(release.tool)) continue;

      const releaseDate = new Date(release.date);
      const monthKey = `${releaseDate.getFullYear()}-${String(releaseDate.getMonth() + 1).padStart(2, '0')}`;

      const monthData = monthsData.find((m) => m.month === monthKey);
      if (monthData) {
        monthData.counts[release.tool] = (monthData.counts[release.tool] || 0) + 1;
      }
    }

    return monthsData;
  }, [releases, selectedTools, months]);

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    let max = 0;
    for (const month of chartData) {
      for (const toolId of selectedTools) {
        max = Math.max(max, month.counts[toolId] || 0);
      }
    }
    return Math.max(max, 1);
  }, [chartData, selectedTools]);

  // Calculate totals for summary
  const totals = useMemo(() => {
    const result = {} as Record<ToolId, number>;
    for (const toolId of selectedTools) {
      result[toolId] = chartData.reduce((sum, month) => sum + (month.counts[toolId] || 0), 0);
    }
    return result;
  }, [chartData, selectedTools]);

  const chartHeight = 200;
  const barWidth = 100 / chartData.length / (selectedTools.length + 1);
  const barGap = barWidth * 0.2;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-1">Release Velocity</h3>
      <p className="text-sm text-slate-400 mb-4">Releases per month over the last {months} months</p>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selectedTools.map((toolId) => {
          const config = TOOL_CONFIG[toolId];
          return (
            <div key={toolId} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5">
              <span className={`w-3 h-3 rounded-full ${config.bgColor}`} />
              <span className="text-sm text-slate-300">{config.shortName}</span>
              <span className="text-sm font-bold text-white">{totals[toolId]}</span>
            </div>
          );
        })}
      </div>

      {/* SVG Chart */}
      <div className="relative" style={{ height: chartHeight + 40 }}>
        <svg
          viewBox={`0 0 ${chartData.length * 100} ${chartHeight + 40}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line
                x1="0"
                y1={chartHeight - chartHeight * ratio}
                x2={chartData.length * 100}
                y2={chartHeight - chartHeight * ratio}
                stroke="rgba(148, 163, 184, 0.1)"
                strokeWidth="1"
              />
              <text
                x="-5"
                y={chartHeight - chartHeight * ratio + 4}
                fill="rgba(148, 163, 184, 0.5)"
                fontSize="10"
                textAnchor="end"
              >
                {Math.round(maxValue * ratio)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {chartData.map((month, monthIndex) => (
            <g key={month.month}>
              {selectedTools.map((toolId, toolIndex) => {
                const config = TOOL_CONFIG[toolId];
                const count = month.counts[toolId] || 0;
                const barHeight = (count / maxValue) * chartHeight;
                const x =
                  monthIndex * 100 + 10 + toolIndex * (barWidth + barGap) * (chartData.length / selectedTools.length);
                const y = chartHeight - barHeight;

                // Get the actual color from the config
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
                  <g key={toolId}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth * (chartData.length / selectedTools.length) * 0.8}
                      height={barHeight}
                      fill={fill}
                      rx="2"
                      className="transition-all duration-300 hover:brightness-110"
                    />
                    {count > 0 && (
                      <text
                        x={x + (barWidth * (chartData.length / selectedTools.length) * 0.8) / 2}
                        y={y - 4}
                        fill="white"
                        fontSize="10"
                        textAnchor="middle"
                        className="font-medium"
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Month label */}
              <text
                x={monthIndex * 100 + 50}
                y={chartHeight + 20}
                fill="rgba(148, 163, 184, 0.7)"
                fontSize="11"
                textAnchor="middle"
              >
                {month.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-slate-700">
        {selectedTools.map((toolId) => {
          const config = TOOL_CONFIG[toolId];
          return (
            <div key={toolId} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm ${config.bgColor}`} />
              <span className="text-xs text-slate-400">{config.shortName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

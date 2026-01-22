import { useMemo } from 'react';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import type { FeatureMatrixEntry } from '../types/metrics';

interface FeatureTimelineProps {
  features: FeatureMatrixEntry[];
  selectedTools: ToolId[];
}

interface FeatureAdoption {
  featureId: string;
  featureName: string;
  adoptions: {
    toolId: ToolId;
    addedAt: string | null;
    addedInVersion: string | null;
    isFirst: boolean;
  }[];
}

export function FeatureTimeline({ features, selectedTools }: FeatureTimelineProps) {
  const featureAdoptions = useMemo(() => {
    const result: FeatureAdoption[] = [];

    for (const feature of features) {
      const adoptions: FeatureAdoption['adoptions'] = [];

      for (const toolId of selectedTools) {
        const toolSupport = feature.tools[toolId];
        if (toolSupport?.supported) {
          adoptions.push({
            toolId,
            addedAt: toolSupport.addedAt || null,
            addedInVersion: toolSupport.addedInVersion || null,
            isFirst: false,
          });
        }
      }

      // Sort by date (earliest first), nulls last
      adoptions.sort((a, b) => {
        if (!a.addedAt && !b.addedAt) return 0;
        if (!a.addedAt) return 1;
        if (!b.addedAt) return -1;
        return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      });

      // Mark the first adopter
      if (adoptions.length > 0 && adoptions[0].addedAt) {
        adoptions[0].isFirst = true;
      }

      // Only include features with at least one adoption
      if (adoptions.length > 0) {
        result.push({
          featureId: feature.featureId,
          featureName: feature.featureName,
          adoptions,
        });
      }
    }

    return result;
  }, [features, selectedTools]);

  // Count first-to-market wins per tool
  const firstWins = useMemo(() => {
    const counts = {} as Record<ToolId, number>;
    for (const toolId of selectedTools) {
      counts[toolId] = 0;
    }

    for (const feature of featureAdoptions) {
      const first = feature.adoptions.find((a) => a.isFirst);
      if (first) {
        counts[first.toolId]++;
      }
    }

    return counts;
  }, [featureAdoptions, selectedTools]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-1">Feature Timeline</h3>
      <p className="text-sm text-slate-400 mb-4">Who shipped each feature first</p>

      {/* First-to-market summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {selectedTools
          .filter((toolId) => firstWins[toolId] > 0)
          .sort((a, b) => firstWins[b] - firstWins[a])
          .map((toolId) => {
            const config = TOOL_CONFIG[toolId];
            return (
              <div
                key={toolId}
                className={`${config.bgColor} bg-opacity-20 border border-opacity-40 rounded-lg px-3 py-2 flex items-center gap-2`}
                style={{ borderColor: config.bgColor.replace('bg-', '') }}
              >
                <span className={`${config.color} text-sm font-medium`}>{config.shortName}</span>
                <span className="text-white text-sm font-bold">{firstWins[toolId]}</span>
                <span className="text-slate-400 text-xs">first</span>
              </div>
            );
          })}
      </div>

      {/* Feature timeline list */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {featureAdoptions.map((feature) => (
          <div key={feature.featureId} className="border-l-2 border-slate-700 pl-4">
            <h4 className="text-sm font-medium text-white mb-2">{feature.featureName}</h4>
            <div className="flex flex-wrap gap-2">
              {feature.adoptions.map(({ toolId, addedAt, addedInVersion, isFirst }) => {
                const config = TOOL_CONFIG[toolId];
                return (
                  <div
                    key={toolId}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                      isFirst ? `${config.bgColor} text-white` : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {isFirst && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span className="font-medium">{config.shortName}</span>
                    {addedAt && <span className="opacity-70">({formatDate(addedAt)})</span>}
                    {!addedAt && addedInVersion && <span className="opacity-70">v{addedInVersion}</span>}
                  </div>
                );
              })}

              {/* Show tools that don't have this feature */}
              {selectedTools
                .filter((toolId) => !feature.adoptions.some((a) => a.toolId === toolId))
                .map((toolId) => {
                  const config = TOOL_CONFIG[toolId];
                  return (
                    <div
                      key={toolId}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-slate-800/50 text-slate-600"
                    >
                      <span>{config.shortName}</span>
                      <span className="italic">not yet</span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

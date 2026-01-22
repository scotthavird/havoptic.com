import { TOOL_CONFIG, type ToolId } from '../types/release';
import type { FeatureMatrixEntry } from '../types/metrics';

interface FeatureComparisonCardProps {
  toolId: ToolId;
  features: FeatureMatrixEntry[];
  totalFeatures: number;
}

export function FeatureComparisonCard({ toolId, features, totalFeatures }: FeatureComparisonCardProps) {
  const config = TOOL_CONFIG[toolId];

  const supportedFeatures = features.filter((f) => f.tools[toolId]?.supported);
  const supportedCount = supportedFeatures.length;
  const percentage = totalFeatures > 0 ? Math.round((supportedCount / totalFeatures) * 100) : 0;

  // Group features by category for display
  const featuresByCategory = features.reduce(
    (acc, feature) => {
      const categoryId = feature.categoryId;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(feature);
      return acc;
    },
    {} as Record<string, FeatureMatrixEntry[]>
  );

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className={`${config.bgColor} px-4 py-3`}>
        <a href={`#/tools/${toolId}`} className="hover:underline">
          <h3 className="text-lg font-bold text-white">{config.displayName}</h3>
        </a>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-white">{percentage}%</span>
          <span className="text-sm text-slate-400">
            {supportedCount}/{totalFeatures} features
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.bgColor} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Feature list by category */}
      <div className="px-4 py-3 max-h-96 overflow-y-auto">
        {Object.entries(featuresByCategory).map(([categoryId, categoryFeatures]) => (
          <div key={categoryId} className="mb-4 last:mb-0">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {categoryId.replace(/-/g, ' ')}
            </h4>
            <div className="space-y-1.5">
              {categoryFeatures.map((feature) => {
                const toolSupport = feature.tools[toolId];
                const isSupported = toolSupport?.supported ?? false;
                const addedInfo = toolSupport?.addedInVersion;

                return (
                  <div key={feature.featureId} className="flex items-start gap-2">
                    {isSupported ? (
                      <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${isSupported ? 'text-white' : 'text-slate-500'}`}>
                        {feature.featureName}
                      </span>
                      {isSupported && addedInfo && (
                        <span className="ml-2 text-xs text-slate-500">v{addedInfo}</span>
                      )}
                    </div>
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

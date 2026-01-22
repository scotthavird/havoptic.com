import { useMemo } from 'react';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import type { FeatureMatrixEntry } from '../types/metrics';

interface FeatureHighlightsProps {
  toolId: ToolId;
  features: FeatureMatrixEntry[];
}

export function FeatureHighlights({ toolId, features }: FeatureHighlightsProps) {
  const config = TOOL_CONFIG[toolId];

  const { supportedFeatures, missingFeatures } = useMemo(() => {
    const supported: { feature: FeatureMatrixEntry; addedAt: string | null; addedInVersion: string | null }[] = [];
    const missing: FeatureMatrixEntry[] = [];

    for (const feature of features) {
      const toolSupport = feature.tools[toolId];
      if (toolSupport?.supported) {
        supported.push({
          feature,
          addedAt: toolSupport.addedAt || null,
          addedInVersion: toolSupport.addedInVersion || null,
        });
      } else {
        missing.push(feature);
      }
    }

    // Sort supported by date (most recent first)
    supported.sort((a, b) => {
      if (!a.addedAt && !b.addedAt) return 0;
      if (!a.addedAt) return 1;
      if (!b.addedAt) return -1;
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });

    return { supportedFeatures: supported, missingFeatures: missing };
  }, [features, toolId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">Feature Highlights</h3>

      {/* Supported features */}
      <div className="mb-6">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="text-green-400">✓</span>
          Supported ({supportedFeatures.length})
        </h4>
        <div className="space-y-2">
          {supportedFeatures.slice(0, 8).map(({ feature, addedAt, addedInVersion }) => (
            <div
              key={feature.featureId}
              className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0"
            >
              <span className="text-sm text-white">{feature.featureName}</span>
              <span className="text-xs text-slate-500">
                {addedAt ? formatDate(addedAt) : addedInVersion ? `v${addedInVersion}` : ''}
              </span>
            </div>
          ))}
          {supportedFeatures.length > 8 && (
            <div className="text-xs text-slate-500 text-center pt-2">
              +{supportedFeatures.length - 8} more features
            </div>
          )}
        </div>
      </div>

      {/* Missing features */}
      {missingFeatures.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="text-slate-600">○</span>
            Not Yet Available ({missingFeatures.length})
          </h4>
          <div className="space-y-2">
            {missingFeatures.slice(0, 5).map((feature) => (
              <div
                key={feature.featureId}
                className="flex items-center py-1.5 border-b border-slate-700/50 last:border-0"
              >
                <span className="text-sm text-slate-500">{feature.featureName}</span>
              </div>
            ))}
            {missingFeatures.length > 5 && (
              <div className="text-xs text-slate-500 text-center pt-2">
                +{missingFeatures.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compare link */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <a
          href={`#/compare?tools=${toolId},claude-code`}
          className={`text-sm ${config.color} hover:underline`}
        >
          Compare features with other tools →
        </a>
      </div>
    </div>
  );
}

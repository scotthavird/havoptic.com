import { useState, useMemo } from 'react';
import { useFeatureMatrix } from '../hooks/useMetrics';
import { TOOL_CONFIG, type ToolId } from '../types/release';

const TOOL_IDS: ToolId[] = ['claude-code', 'openai-codex', 'cursor', 'gemini-cli', 'kiro'];

function FeatureCell({ supported, notes }: { supported: boolean; notes?: string }) {
  return (
    <td className="border border-slate-700 px-3 py-2 text-center">
      {supported ? (
        <span className="text-green-400" title={notes || 'Supported'}>
          ✓
        </span>
      ) : (
        <span className="text-slate-600">—</span>
      )}
    </td>
  );
}

export function Compare() {
  const [selectedTools, setSelectedTools] = useState<ToolId[]>(['claude-code', 'cursor']);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const { categories, features, featuresByCategory, featureCountByTool, loading, error, lastUpdated } =
    useFeatureMatrix();

  const displayedFeatures = useMemo(() => {
    if (selectedCategory === 'all') return features;
    return featuresByCategory[selectedCategory] || [];
  }, [selectedCategory, features, featuresByCategory]);

  const toggleTool = (toolId: ToolId) => {
    if (selectedTools.includes(toolId)) {
      if (selectedTools.length > 1) {
        setSelectedTools(selectedTools.filter((t) => t !== toolId));
      }
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-center py-12 text-slate-400">Loading feature comparison...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="text-center py-12 text-red-400" role="alert">
          Error: {error}
        </div>
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
        <h1 className="text-3xl font-bold text-white mb-2">Feature Comparison</h1>
        <p className="text-slate-400">
          Compare capabilities across AI coding tools
        </p>
        {lastUpdated && (
          <p className="text-xs text-slate-500 mt-2">
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tool selector */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Select tools to compare</h2>
        <div className="flex flex-wrap gap-2">
          {TOOL_IDS.map((toolId) => {
            const config = TOOL_CONFIG[toolId];
            const isSelected = selectedTools.includes(toolId);
            const count = featureCountByTool[toolId] || 0;
            return (
              <button
                key={toolId}
                onClick={() => toggleTool(toolId)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  isSelected
                    ? `${config.bgColor} text-white`
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {config.displayName}
                <span className={`text-xs ${isSelected ? 'opacity-80' : 'text-slate-500'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Filter by category</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Feature matrix table */}
      {displayedFeatures.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No feature data available yet.</p>
          <p className="text-sm mt-2">Check back after the feature matrix is populated.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-700 text-sm">
            <thead>
              <tr className="bg-slate-800">
                <th className="border border-slate-700 px-4 py-3 text-left text-white font-semibold">
                  Feature
                </th>
                {selectedTools.map((toolId) => {
                  const config = TOOL_CONFIG[toolId];
                  return (
                    <th
                      key={toolId}
                      className={`border border-slate-700 px-4 py-3 text-center text-white font-semibold ${config.bgColor}`}
                    >
                      {config.displayName}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedFeatures.map((feature) => (
                <tr key={feature.featureId} className="hover:bg-slate-800/50">
                  <td className="border border-slate-700 px-4 py-3">
                    <div className="text-white font-medium">{feature.featureName}</div>
                    <div className="text-xs text-slate-500">{feature.description}</div>
                  </td>
                  {selectedTools.map((toolId) => (
                    <FeatureCell
                      key={toolId}
                      supported={feature.tools[toolId]?.supported ?? false}
                      notes={feature.tools[toolId]?.notes}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        {selectedTools.map((toolId) => {
          const config = TOOL_CONFIG[toolId];
          const count = featureCountByTool[toolId] || 0;
          const total = features.length;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={toolId} className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className={`text-lg font-bold ${config.color}`}>{percentage}%</div>
              <div className="text-xs text-slate-500">
                {count}/{total} features
              </div>
              <div className="text-sm text-slate-400 mt-1">{config.displayName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { useFeatureMatrix, useVelocityMetrics } from '../hooks/useMetrics';
import { useReleases } from '../hooks/useReleases';
import { BreadcrumbSchema } from '../components/BreadcrumbSchema';
import { Link } from '../components/Link';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { ToolSearchSelector } from '../components/ToolSearchSelector';
import { FeatureComparisonCard } from '../components/FeatureComparisonCard';
import { ReleaseVelocityChart } from '../components/ReleaseVelocityChart';
import { FeatureTimeline } from '../components/FeatureTimeline';

interface CompareVsProps {
  tool1: ToolId;
  tool2: ToolId;
}

export function CompareVs({ tool1, tool2 }: CompareVsProps) {
  // Set page title and meta dynamically
  useEffect(() => {
    const config1 = TOOL_CONFIG[tool1];
    const config2 = TOOL_CONFIG[tool2];
    document.title = `${config1.shortName} vs ${config2.shortName} - Feature Comparison | Havoptic`;
  }, [tool1, tool2]);

  const [selectedTools, setSelectedTools] = useState<ToolId[]>([tool1, tool2]);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const { categories, features, featuresByCategory, featureCountByTool, loading, error, lastUpdated } =
    useFeatureMatrix();
  const { releases } = useReleases('all');
  const { getToolVelocity } = useVelocityMetrics();

  // Update URL when tools change (but only if different from initial)
  useEffect(() => {
    const basePath = '/compare';
    if (selectedTools.length === 2 && selectedTools[0] === tool1 && selectedTools[1] === tool2) {
      // Keep the SEO-friendly URL
      return;
    }
    // If tools changed, update to query param version
    const newUrl = selectedTools.length > 0 ? `${basePath}?tools=${selectedTools.join(',')}` : basePath;
    const currentUrl = window.location.pathname + window.location.search;
    if (!currentUrl.includes(newUrl.split('?')[0])) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [selectedTools, tool1, tool2]);

  const displayedFeatures = useMemo(() => {
    if (selectedCategory === 'all') return features;
    return featuresByCategory[selectedCategory] || [];
  }, [selectedCategory, features, featuresByCategory]);

  // Filter releases for selected tools
  const filteredReleases = useMemo(() => {
    return releases.filter((r) => selectedTools.includes(r.tool));
  }, [releases, selectedTools]);

  // Calculate velocity comparison
  const velocityComparison = useMemo(() => {
    return selectedTools
      .map((toolId) => ({
        toolId,
        metrics: getToolVelocity(toolId),
      }))
      .filter((t) => t.metrics)
      .sort((a, b) => (b.metrics?.releasesThisMonth || 0) - (a.metrics?.releasesThisMonth || 0));
  }, [selectedTools, getToolVelocity]);

  const config1 = TOOL_CONFIG[tool1];
  const config2 = TOOL_CONFIG[tool2];

  // Breadcrumb for SEO
  const breadcrumbItems = [
    { name: 'Home', url: 'https://havoptic.com/' },
    { name: 'Compare', url: 'https://havoptic.com/compare' },
    { name: `${config1.shortName} vs ${config2.shortName}`, url: `https://havoptic.com/compare/${tool1}-vs-${tool2}` },
  ];

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
      <BreadcrumbSchema items={breadcrumbItems} />
      <Link
        href="/compare"
        className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back to Comparison Tool
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className={config1.color}>{config1.displayName}</span>
          {' '}vs{' '}
          <span className={config2.color}>{config2.displayName}</span>
        </h1>
        <p className="text-slate-400">
          Compare features, release velocity, and capabilities between {config1.shortName} and {config2.shortName}
        </p>
        {lastUpdated && (
          <p className="text-xs text-slate-500 mt-2">
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tool selector (allows adding more tools) */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Add more tools to compare (max 4)</h2>
        <ToolSearchSelector
          selectedTools={selectedTools}
          onChange={setSelectedTools}
          maxTools={4}
        />
      </div>

      {/* Release Velocity Chart */}
      {filteredReleases.length > 0 && (
        <div className="mb-8">
          <ReleaseVelocityChart releases={filteredReleases} selectedTools={selectedTools} months={6} />
        </div>
      )}

      {/* Velocity Quick Stats */}
      {velocityComparison.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {velocityComparison.map(({ toolId, metrics }) => {
            const config = TOOL_CONFIG[toolId];
            return (
              <div key={toolId} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className={`text-lg font-bold ${config.color}`}>{metrics?.releasesThisMonth || 0}</div>
                <div className="text-xs text-slate-500">releases this month</div>
                <div className="text-sm text-slate-400 mt-1">{config.shortName}</div>
                {metrics?.averageDaysBetweenReleases && (
                  <div className="text-xs text-slate-500 mt-1">
                    ~{metrics.averageDaysBetweenReleases.toFixed(0)} days between releases
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Feature Timeline */}
      {displayedFeatures.length > 0 && (
        <div className="mb-8">
          <FeatureTimeline features={displayedFeatures} selectedTools={selectedTools} />
        </div>
      )}

      {/* Category filter */}
      <div className="mb-6">
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

      {/* Feature comparison cards */}
      {displayedFeatures.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No feature data available yet.</p>
          <p className="text-sm mt-2">Check back after the feature matrix is populated.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {selectedTools.map((toolId) => (
            <FeatureComparisonCard
              key={toolId}
              toolId={toolId}
              features={displayedFeatures}
              totalFeatures={displayedFeatures.length}
            />
          ))}
        </div>
      )}

      {/* Feature coverage summary */}
      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Feature Coverage Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedTools.map((toolId) => {
            const config = TOOL_CONFIG[toolId];
            const count = featureCountByTool[toolId] || 0;
            const total = features.length;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={toolId} className="text-center">
                <div className={`text-3xl font-bold ${config.color}`}>{percentage}%</div>
                <div className="text-xs text-slate-500 mt-1">
                  {count}/{total} features
                </div>
                <div className="text-sm text-slate-400 mt-1">{config.displayName}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Related comparisons */}
      <div className="mt-8 pt-8 border-t border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">More Comparisons</h3>
        <div className="flex flex-wrap gap-2">
          {getRelatedComparisons(tool1, tool2).map(({ t1, t2 }) => (
            <Link
              key={`${t1}-${t2}`}
              href={`/compare/${t1}-vs-${t2}`}
              className="px-3 py-1.5 rounded-full text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {TOOL_CONFIG[t1].shortName} vs {TOOL_CONFIG[t2].shortName}
            </Link>
          ))}
        </div>
      </div>

      {/* Share URL hint */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-500">
          Share this comparison:{' '}
          <code className="bg-slate-800 px-2 py-1 rounded text-slate-400">
            {window.location.origin}/compare/{tool1}-vs-{tool2}
          </code>
        </p>
      </div>
    </div>
  );
}

// Helper to get related comparison pairs
function getRelatedComparisons(tool1: ToolId, tool2: ToolId): { t1: ToolId; t2: ToolId }[] {
  const allTools = Object.keys(TOOL_CONFIG) as ToolId[];
  const related: { t1: ToolId; t2: ToolId }[] = [];

  // Get comparisons involving tool1 or tool2 with other tools
  for (const tool of allTools) {
    if (tool === tool1 || tool === tool2) continue;

    // Add comparison with tool1
    if (tool1 < tool) {
      related.push({ t1: tool1, t2: tool });
    } else {
      related.push({ t1: tool, t2: tool1 });
    }

    // Add comparison with tool2
    if (tool2 < tool) {
      related.push({ t1: tool2, t2: tool });
    } else {
      related.push({ t1: tool, t2: tool2 });
    }
  }

  // Remove duplicates and limit
  const seen = new Set<string>();
  return related
    .filter(({ t1, t2 }) => {
      const key = `${t1}-${t2}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

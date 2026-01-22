import { useState, useMemo, useEffect } from 'react';
import { useFeatureMatrix, useVelocityMetrics } from '../hooks/useMetrics';
import { useReleases } from '../hooks/useReleases';
import { usePageMeta, PAGE_META } from '../hooks/usePageMeta';
import { BreadcrumbSchema, BREADCRUMBS } from '../components/BreadcrumbSchema';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { getAllToolIds } from '../utils/toolRegistry';
import { ToolSearchSelector } from '../components/ToolSearchSelector';
import { FeatureComparisonCard } from '../components/FeatureComparisonCard';
import { ReleaseVelocityChart } from '../components/ReleaseVelocityChart';
import { FeatureTimeline } from '../components/FeatureTimeline';

// Parse tools from URL hash
function getToolsFromUrl(): ToolId[] {
  const hash = window.location.hash;
  const match = hash.match(/[?&]tools=([^&]+)/);
  if (match) {
    const toolsParam = decodeURIComponent(match[1]);
    const tools = toolsParam.split(',').filter((t) => getAllToolIds().includes(t as ToolId)) as ToolId[];
    if (tools.length >= 1) {
      return tools.slice(0, 4); // Max 4 tools
    }
  }
  return ['claude-code', 'cursor']; // Default
}

// Update URL with selected tools
function updateUrl(tools: ToolId[]) {
  const baseHash = '#/compare';
  const newHash = tools.length > 0 ? `${baseHash}?tools=${tools.join(',')}` : baseHash;
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, '', newHash);
  }
}

export function Compare() {
  usePageMeta(PAGE_META.compare);

  const [selectedTools, setSelectedTools] = useState<ToolId[]>(getToolsFromUrl);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const { categories, features, featuresByCategory, featureCountByTool, loading, error, lastUpdated } =
    useFeatureMatrix();
  const { releases } = useReleases('all');
  const { getToolVelocity } = useVelocityMetrics();

  // Sync URL when tools change
  useEffect(() => {
    updateUrl(selectedTools);
  }, [selectedTools]);

  // Listen for URL changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const urlTools = getToolsFromUrl();
      setSelectedTools(urlTools);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
      <BreadcrumbSchema items={BREADCRUMBS.compare} />
      <a
        href="#/"
        className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back to Timeline
      </a>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Feature Comparison</h1>
        <p className="text-slate-400">
          Compare capabilities and release velocity across AI coding tools
        </p>
        {lastUpdated && (
          <p className="text-xs text-slate-500 mt-2">
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Tool selector */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Select tools to compare (max 4)</h2>
        <ToolSearchSelector
          selectedTools={selectedTools}
          onChange={setSelectedTools}
          maxTools={4}
        />
      </div>

      {/* Release Velocity Chart - THE DIFFERENTIATOR */}
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

      {/* Feature Timeline - "Who shipped first" */}
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

      {/* Share URL hint */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-500">
          Share this comparison:{' '}
          <code className="bg-slate-800 px-2 py-1 rounded text-slate-400">
            {window.location.origin}/#/compare?tools={selectedTools.join(',')}
          </code>
        </p>
      </div>
    </div>
  );
}

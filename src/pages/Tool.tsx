import { useReleases } from '../hooks/useReleases';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { useGitHubStats, useNpmDownloads, useVelocityMetrics, useFeatureMatrix } from '../hooks/useMetrics';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { getSimilarTools } from '../utils/toolRegistry';
import { Timeline } from '../components/Timeline';
import { ReleaseHistoryChart } from '../components/ReleaseHistoryChart';
import { FeatureHighlights } from '../components/FeatureHighlights';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

interface ToolProps {
  toolId: ToolId;
}

export function Tool({ toolId }: ToolProps) {
  const config = TOOL_CONFIG[toolId];
  const { groupedReleases, releases, loading: releasesLoading, error: releasesError } = useReleases(toolId);
  const { posts: relatedPosts } = useBlogPosts({ tool: toolId, limit: 5 });
  const { getToolStats } = useGitHubStats();
  const { getToolStats: getNpmStats } = useNpmDownloads();
  const { getToolVelocity } = useVelocityMetrics();
  const { features, featureCountByTool } = useFeatureMatrix();

  const githubStats = getToolStats(toolId)?.github;
  const npmStats = getNpmStats(toolId)?.npm;
  const velocityStats = getToolVelocity(toolId);
  const similarTools = getSimilarTools(toolId, 3);

  // Calculate feature coverage
  const featureCount = featureCountByTool[toolId] || 0;
  const totalFeatures = features.length;
  const featurePercentage = totalFeatures > 0 ? Math.round((featureCount / totalFeatures) * 100) : 0;

  // Get first release date
  const firstRelease = releases.length > 0 ? releases[releases.length - 1] : null;

  if (!config) {
    return (
      <div className="py-8">
        <a
          href="#/"
          className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
        >
          &larr; Back to Timeline
        </a>
        <div className="text-center py-12 text-slate-400">
          <p className="text-xl mb-4">Tool not found</p>
          <p className="text-sm">The tool you're looking for doesn't exist.</p>
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

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h1 className={`text-3xl font-bold ${config.color}`}>{config.displayName}</h1>
          <span className="text-sm text-slate-500">{config.hashtag}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${config.bgColor} text-white`}>
            {config.category.toUpperCase()}
          </span>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{releases.length}</div>
            <div className="text-xs text-slate-500">Total Releases</div>
            {firstRelease && (
              <div className="text-xs text-slate-600 mt-1">
                since {new Date(firstRelease.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>

          {velocityStats && (
            <>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{velocityStats.releasesThisMonth}</div>
                <div className="text-xs text-slate-500">This Month</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{velocityStats.averageDaysBetweenReleases.toFixed(0)}</div>
                <div className="text-xs text-slate-500">Avg Days Between</div>
              </div>
            </>
          )}

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className={`text-2xl font-bold ${config.color}`}>{featurePercentage}%</div>
            <div className="text-xs text-slate-500">Feature Coverage</div>
            <div className="text-xs text-slate-600 mt-1">{featureCount}/{totalFeatures} features</div>
          </div>

          {githubStats && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{formatNumber(githubStats.stars)}</div>
              <div className="text-xs text-slate-500">GitHub Stars</div>
            </div>
          )}

          {npmStats && !githubStats && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{formatNumber(npmStats.weeklyDownloads)}</div>
              <div className="text-xs text-slate-500">Weekly Downloads</div>
            </div>
          )}
        </div>
      </div>

      {/* Release History Chart */}
      {releases.length > 0 && (
        <div className="mb-8">
          <ReleaseHistoryChart releases={releases} toolId={toolId} />
        </div>
      )}

      {/* Compare with Similar Tools */}
      {similarTools.length > 0 && (
        <div className="mb-8 bg-slate-800/30 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Compare with Similar Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {similarTools.map((otherToolId) => {
              const otherConfig = TOOL_CONFIG[otherToolId];
              const otherVelocity = getToolVelocity(otherToolId);
              const otherFeatureCount = featureCountByTool[otherToolId] || 0;

              return (
                <a
                  key={otherToolId}
                  href={`#/compare?tools=${toolId},${otherToolId}`}
                  className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors border border-slate-700"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-3 h-3 rounded-full ${otherConfig.bgColor}`} />
                    <span className={`font-medium ${otherConfig.color}`}>{otherConfig.displayName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Releases/mo:</span>
                      <span className="ml-1 text-white">{otherVelocity?.releasesThisMonth || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Features:</span>
                      <span className="ml-1 text-white">{otherFeatureCount}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-400">Compare →</div>
                </a>
              );
            })}
          </div>

          {/* Velocity comparison summary */}
          {velocityStats && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                <span className={config.color}>{config.shortName}</span> ships{' '}
                <span className="text-white font-medium">
                  {velocityStats.averageDaysBetweenReleases.toFixed(0)} days
                </span>{' '}
                between releases on average
              </p>
            </div>
          )}
        </div>
      )}

      {/* Two columns on desktop */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content - releases */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-white mb-4">Release History</h2>

          {releasesLoading && (
            <div className="text-center py-12 text-slate-400">Loading releases...</div>
          )}

          {releasesError && (
            <div className="text-center py-12 text-red-400" role="alert">
              Error: {releasesError}
            </div>
          )}

          {!releasesLoading && !releasesError && (
            <Timeline groupedReleases={groupedReleases} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Feature Highlights */}
          {features.length > 0 && (
            <FeatureHighlights toolId={toolId} features={features} />
          )}

          {/* GitHub stats */}
          {githubStats && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">GitHub</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Stars</dt>
                  <dd className="text-white font-medium">{formatNumber(githubStats.stars)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Forks</dt>
                  <dd className="text-white font-medium">{formatNumber(githubStats.forks)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Contributors</dt>
                  <dd className="text-white font-medium">{githubStats.contributors}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Open Issues</dt>
                  <dd className="text-white font-medium">{githubStats.openIssues}</dd>
                </div>
                {githubStats.lastCommitAt && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Last Commit</dt>
                    <dd className="text-white text-sm">{formatDate(githubStats.lastCommitAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* npm stats */}
          {npmStats && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">npm</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Weekly Downloads</dt>
                  <dd className="text-white font-medium">{formatNumber(npmStats.weeklyDownloads)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Monthly Downloads</dt>
                  <dd className="text-white font-medium">{formatNumber(npmStats.monthlyDownloads)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Trend</dt>
                  <dd
                    className={`font-medium ${npmStats.downloadsTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {npmStats.downloadsTrend > 0 ? '+' : ''}
                    {npmStats.downloadsTrend}%
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Related blog posts */}
          {relatedPosts.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Related Posts</h3>
              <ul className="space-y-3">
                {relatedPosts.map((post) => (
                  <li key={post.id}>
                    <a
                      href={`#/blog/${post.slug}`}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors block"
                    >
                      {post.title}
                    </a>
                    <span className="text-xs text-slate-500">{formatDate(post.publishedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <div className="space-y-2">
              <a
                href={`#/compare?tools=${toolId},cursor,claude-code`}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors block"
              >
                Compare with other tools →
              </a>
              <a
                href="#/trends"
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors block"
              >
                View trends & insights →
              </a>
              <a
                href="#/blog"
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors block"
              >
                Read analysis & insights →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METRICS_PATH = path.join(__dirname, '..', 'public', 'data', 'metrics');
const GITHUB_STATS_PATH = path.join(METRICS_PATH, 'github-stats.json');
const NPM_DOWNLOADS_PATH = path.join(METRICS_PATH, 'npm-downloads.json');
const VELOCITY_PATH = path.join(METRICS_PATH, 'velocity.json');
const RELEASES_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Tool configurations for external data sources
const TOOL_GITHUB_REPOS = {
  'claude-code': 'anthropics/claude-code',
  'openai-codex': 'openai/codex',
  'cursor': null, // Closed source
  'gemini-cli': 'google-gemini/gemini-cli',
  'kiro': null, // Closed source
};

const TOOL_NPM_PACKAGES = {
  'claude-code': '@anthropic-ai/claude-code',
  'openai-codex': '@openai/codex',
  'cursor': null,
  'gemini-cli': '@google/gemini-cli',
  'kiro': null,
};

// Fetch GitHub repository stats
async function fetchGitHubStats(repo) {
  if (!repo) return null;

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'havoptic-metrics-tracker',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    // Fetch basic repo info
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (!repoRes.ok) {
      console.log(`  GitHub API returned ${repoRes.status} for ${repo}`);
      return null;
    }
    const repoData = await repoRes.json();

    // Fetch contributors count (limited to first page for efficiency)
    const contribRes = await fetch(`https://api.github.com/repos/${repo}/contributors?per_page=1&anon=true`, { headers });
    let contributorCount = 0;
    if (contribRes.ok) {
      // Get total from Link header
      const linkHeader = contribRes.headers.get('Link');
      if (linkHeader) {
        const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastMatch) {
          contributorCount = parseInt(lastMatch[1], 10);
        }
      } else {
        const contribData = await contribRes.json();
        contributorCount = contribData.length;
      }
    }

    // Fetch recent commits for activity metrics
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get commits from last week for recent activity
    const commitsRes = await fetch(
      `https://api.github.com/repos/${repo}/commits?since=${oneWeekAgo}&per_page=1`,
      { headers }
    );

    // Estimate stars gained this week/month using stargazers API (if available)
    // Note: This is an approximation - accurate star history requires paid APIs
    let starsThisWeek = 0;
    let starsThisMonth = 0;

    return {
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      openIssues: repoData.open_issues_count || 0,
      contributors: contributorCount,
      lastCommitAt: repoData.pushed_at || null,
      starsThisWeek,
      starsThisMonth,
    };
  } catch (err) {
    console.error(`  Error fetching GitHub stats for ${repo}:`, err.message);
    return null;
  }
}

// Fetch npm download stats
async function fetchNpmDownloads(packageName) {
  if (!packageName) return null;

  try {
    // Weekly downloads
    const weeklyRes = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`
    );
    const weeklyData = weeklyRes.ok ? await weeklyRes.json() : null;

    // Monthly downloads
    const monthlyRes = await fetch(
      `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(packageName)}`
    );
    const monthlyData = monthlyRes.ok ? await monthlyRes.json() : null;

    // Calculate trend: compare this week to previous week
    const prevWeekRes = await fetch(
      `https://api.npmjs.org/downloads/range/last-month/${encodeURIComponent(packageName)}`
    );
    let downloadsTrend = 0;
    if (prevWeekRes.ok) {
      const rangeData = await prevWeekRes.json();
      if (rangeData.downloads && rangeData.downloads.length >= 14) {
        const recent7 = rangeData.downloads.slice(-7);
        const prev7 = rangeData.downloads.slice(-14, -7);
        const recentTotal = recent7.reduce((sum, d) => sum + d.downloads, 0);
        const prevTotal = prev7.reduce((sum, d) => sum + d.downloads, 0);
        if (prevTotal > 0) {
          downloadsTrend = ((recentTotal - prevTotal) / prevTotal) * 100;
        }
      }
    }

    return {
      weeklyDownloads: weeklyData?.downloads || 0,
      monthlyDownloads: monthlyData?.downloads || 0,
      totalDownloads: monthlyData?.downloads || 0, // npm API doesn't provide all-time easily
      downloadsTrend: Math.round(downloadsTrend * 10) / 10,
    };
  } catch (err) {
    console.error(`  Error fetching npm stats for ${packageName}:`, err.message);
    return null;
  }
}

// Calculate velocity metrics from releases data
async function calculateVelocityMetrics() {
  try {
    const releasesContent = await fs.readFile(RELEASES_PATH, 'utf-8');
    const releasesData = JSON.parse(releasesContent);
    const releases = releasesData.releases || [];

    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const oneQuarterAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    const toolIds = ['claude-code', 'openai-codex', 'cursor', 'gemini-cli', 'kiro'];
    const velocityMetrics = {};

    for (const toolId of toolIds) {
      const toolReleases = releases.filter((r) => r.tool === toolId);

      if (toolReleases.length === 0) {
        velocityMetrics[toolId] = {
          toolId,
          releasesThisWeek: 0,
          releasesThisMonth: 0,
          releasesThisQuarter: 0,
          averageDaysBetweenReleases: 0,
          featuresPerRelease: 0,
          lastReleaseAt: null,
        };
        continue;
      }

      // Sort by date descending
      toolReleases.sort((a, b) => new Date(b.date) - new Date(a.date));

      const releasesThisWeek = toolReleases.filter((r) => new Date(r.date) >= oneWeekAgo).length;
      const releasesThisMonth = toolReleases.filter((r) => new Date(r.date) >= oneMonthAgo).length;
      const releasesThisQuarter = toolReleases.filter((r) => new Date(r.date) >= oneQuarterAgo).length;

      // Calculate average days between releases (last 10 releases)
      let avgDays = 0;
      const recentReleases = toolReleases.slice(0, 10);
      if (recentReleases.length > 1) {
        let totalDays = 0;
        for (let i = 0; i < recentReleases.length - 1; i++) {
          const diff = new Date(recentReleases[i].date) - new Date(recentReleases[i + 1].date);
          totalDays += diff / (1000 * 60 * 60 * 24);
        }
        avgDays = Math.round((totalDays / (recentReleases.length - 1)) * 10) / 10;
      }

      // Estimate features per release based on fullNotes length
      const avgNotesLength =
        toolReleases.reduce((sum, r) => sum + (r.fullNotes?.length || 0), 0) / toolReleases.length;
      // Rough heuristic: ~100 chars per feature
      const featuresPerRelease = Math.round((avgNotesLength / 100) * 10) / 10;

      velocityMetrics[toolId] = {
        toolId,
        releasesThisWeek,
        releasesThisMonth,
        releasesThisQuarter,
        averageDaysBetweenReleases: avgDays,
        featuresPerRelease,
        lastReleaseAt: toolReleases[0]?.date || null,
      };
    }

    return velocityMetrics;
  } catch (err) {
    console.error('Error calculating velocity metrics:', err.message);
    return {};
  }
}

async function main() {
  console.log('Fetching external metrics...\n');

  // Ensure metrics directory exists
  await fs.mkdir(METRICS_PATH, { recursive: true });

  // Load existing metrics to preserve historical data
  let existingGitHub = {};
  let existingNpm = {};
  try {
    const githubContent = await fs.readFile(GITHUB_STATS_PATH, 'utf-8');
    existingGitHub = JSON.parse(githubContent).tools || {};
  } catch {
    /* No existing file */
  }
  try {
    const npmContent = await fs.readFile(NPM_DOWNLOADS_PATH, 'utf-8');
    existingNpm = JSON.parse(npmContent).tools || {};
  } catch {
    /* No existing file */
  }

  const toolIds = Object.keys(TOOL_GITHUB_REPOS);
  const githubStats = {};
  const npmStats = {};

  // Fetch GitHub stats
  console.log('Fetching GitHub stats...');
  for (const toolId of toolIds) {
    const repo = TOOL_GITHUB_REPOS[toolId];
    if (repo) {
      console.log(`  Fetching ${toolId} (${repo})...`);
      const stats = await fetchGitHubStats(repo);
      if (stats) {
        githubStats[toolId] = {
          toolId,
          github: stats,
          fetchedAt: new Date().toISOString(),
        };
        console.log(`    Stars: ${stats.stars}, Forks: ${stats.forks}, Contributors: ${stats.contributors}`);
      }
    } else {
      console.log(`  Skipping ${toolId} (no public repo)`);
    }
  }

  // Fetch npm download stats
  console.log('\nFetching npm download stats...');
  for (const toolId of toolIds) {
    const packageName = TOOL_NPM_PACKAGES[toolId];
    if (packageName) {
      console.log(`  Fetching ${toolId} (${packageName})...`);
      const stats = await fetchNpmDownloads(packageName);
      if (stats) {
        npmStats[toolId] = {
          toolId,
          npm: stats,
          fetchedAt: new Date().toISOString(),
        };
        console.log(
          `    Weekly: ${stats.weeklyDownloads.toLocaleString()}, Monthly: ${stats.monthlyDownloads.toLocaleString()}, Trend: ${stats.downloadsTrend > 0 ? '+' : ''}${stats.downloadsTrend}%`
        );
      }
    } else {
      console.log(`  Skipping ${toolId} (not an npm package)`);
    }
  }

  // Calculate velocity metrics
  console.log('\nCalculating velocity metrics...');
  const velocityMetrics = await calculateVelocityMetrics();
  for (const [toolId, metrics] of Object.entries(velocityMetrics)) {
    console.log(
      `  ${toolId}: ${metrics.releasesThisMonth} releases/month, avg ${metrics.averageDaysBetweenReleases} days between releases`
    );
  }

  // Write output files
  const timestamp = new Date().toISOString();

  await fs.writeFile(
    GITHUB_STATS_PATH,
    JSON.stringify({ lastUpdated: timestamp, tools: { ...existingGitHub, ...githubStats } }, null, 2)
  );
  console.log(`\nWritten GitHub stats to ${GITHUB_STATS_PATH}`);

  await fs.writeFile(
    NPM_DOWNLOADS_PATH,
    JSON.stringify({ lastUpdated: timestamp, tools: { ...existingNpm, ...npmStats } }, null, 2)
  );
  console.log(`Written npm downloads to ${NPM_DOWNLOADS_PATH}`);

  await fs.writeFile(
    VELOCITY_PATH,
    JSON.stringify({ lastUpdated: timestamp, tools: velocityMetrics }, null, 2)
  );
  console.log(`Written velocity metrics to ${VELOCITY_PATH}`);

  console.log('\nMetrics fetch complete!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const RELEASES_PATH = path.join(DATA_DIR, 'releases.json');
const METRICS_DIR = path.join(DATA_DIR, 'metrics');

const TOOL_DISPLAY_NAMES = {
  'claude-code': 'Claude Code',
  'openai-codex': 'OpenAI Codex CLI',
  'cursor': 'Cursor',
  'gemini-cli': 'Gemini CLI',
  'kiro': 'Kiro CLI',
};

// Get quarter info
function getQuarterInfo(date) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return {
    quarter,
    year: date.getFullYear(),
    label: `Q${quarter} ${date.getFullYear()}`,
  };
}

// Load JSON file safely
async function loadJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Get releases for a specific quarter
function getReleasesForQuarter(releases, toolId, year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 3;

  return releases.filter((r) => {
    if (r.tool !== toolId) return false;
    const date = new Date(r.date);
    return (
      date.getFullYear() === year &&
      date.getMonth() >= startMonth &&
      date.getMonth() < endMonth
    );
  });
}

// Analyze release patterns
function analyzeReleasePatterns(releases) {
  if (releases.length === 0) return null;

  // Sort by date
  const sorted = [...releases].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate release cadence
  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i].date) - new Date(sorted[i - 1].date);
    totalDays += diff / (1000 * 60 * 60 * 24);
  }
  const avgDaysBetween = sorted.length > 1 ? totalDays / (sorted.length - 1) : 0;

  // Categorize releases by type (major/minor/patch based on version)
  const categories = { major: 0, minor: 0, patch: 0 };
  for (const r of sorted) {
    const parts = r.version.replace(/^v/, '').split('.');
    if (parts.length >= 3) {
      // Heuristic: if third part is 0, it's a minor release
      if (parts[2] === '0') categories.minor++;
      else categories.patch++;
    } else {
      categories.minor++;
    }
  }

  // Extract notable features (longer release notes = more significant)
  const notable = sorted
    .filter((r) => (r.fullNotes?.length || 0) > 100)
    .slice(0, 5)
    .map((r) => ({
      version: r.version,
      date: r.date,
      summary: r.summary,
    }));

  return {
    totalReleases: sorted.length,
    firstRelease: sorted[0].date,
    lastRelease: sorted[sorted.length - 1].date,
    avgDaysBetween: Math.round(avgDaysBetween * 10) / 10,
    categories,
    notable,
  };
}

// Generate the deep dive content using Claude
async function generateDeepDiveContent(client, toolId, quarterReleases, allToolReleases, externalMetrics, quarterInfo) {
  const toolName = TOOL_DISPLAY_NAMES[toolId];
  const patterns = analyzeReleasePatterns(quarterReleases);

  if (!patterns) {
    return null;
  }

  // Build context
  const releasesContext = quarterReleases
    .map((r) => `- v${r.version} (${new Date(r.date).toLocaleDateString()}): ${r.summary}`)
    .join('\n');

  const notableFeatures = patterns.notable
    .map((n) => `- v${n.version}: ${n.summary}`)
    .join('\n');

  // GitHub stats
  let githubContext = '';
  const github = externalMetrics.github?.tools?.[toolId]?.github;
  if (github) {
    githubContext = `\nGitHub: ${github.stars} stars, ${github.forks} forks, ${github.contributors} contributors`;
  }

  // npm stats
  let npmContext = '';
  const npm = externalMetrics.npm?.tools?.[toolId]?.npm;
  if (npm) {
    npmContext = `\nnpm: ${npm.weeklyDownloads.toLocaleString()} weekly downloads (${npm.downloadsTrend > 0 ? '+' : ''}${npm.downloadsTrend}% trend)`;
  }

  // Get all-time stats for comparison
  const allTimePatterns = analyzeReleasePatterns(allToolReleases);

  const systemPrompt = `You are a tech analyst writing an in-depth quarterly review of an AI coding tool.
Write comprehensive, insightful content that helps developers understand the tool's evolution.
Use a professional, analytical tone with specific data points.
Format output as valid JSON with markdown content in the "content" field.

The response must be a JSON object with this exact structure:
{
  "title": "string - compelling title for the deep dive",
  "summary": "string - 150-160 char meta description for SEO",
  "content": "string - full markdown blog post content (1000-1500 words)",
  "keywords": ["array", "of", "seo", "keywords"]
}`;

  const userPrompt = `Write a quarterly deep dive on ${toolName} for ${quarterInfo.label}.

Quarter Stats:
- Total Releases: ${patterns.totalReleases}
- Release Cadence: Every ${patterns.avgDaysBetween} days on average
- Major: ${patterns.categories.major}, Minor: ${patterns.categories.minor}, Patch: ${patterns.categories.patch}
- First: ${new Date(patterns.firstRelease).toLocaleDateString()}
- Last: ${new Date(patterns.lastRelease).toLocaleDateString()}
${githubContext}${npmContext}

All-Time Context:
- Total Releases (all time): ${allTimePatterns?.totalReleases || 'N/A'}
- This quarter represents ${Math.round((patterns.totalReleases / (allTimePatterns?.totalReleases || 1)) * 100)}% of all releases

Notable Releases This Quarter:
${notableFeatures}

All Releases This Quarter:
${releasesContext}

Write a deep dive with these sections:
1. Executive Summary (key highlights, 2-3 sentences)
2. Quarter in Review (what happened, major themes)
3. Major Milestones (top 3-5 significant features with analysis)
4. Evolution Timeline (how the tool changed over the quarter)
5. Community & Adoption (GitHub/npm metrics, growth)
6. Competitive Position (how it compares to other AI coding tools)
7. Looking Forward (predictions based on patterns)

Be specific and data-driven. Reference version numbers when discussing features.
Consider what these releases mean for developers using the tool.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
  });

  // Parse the JSON response
  const text = response.content[0].text;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error('Could not parse JSON from Claude response');
      }
    }
  }

  return parsed;
}

// Create the blog post object
function createBlogPost(content, toolId, quarterReleases, quarterInfo) {
  const id = `deep-dive-${toolId}-${quarterInfo.year}-q${quarterInfo.quarter}`;
  const slug = `deep-dive-${toolId}-q${quarterInfo.quarter}-${quarterInfo.year}`;

  const patterns = analyzeReleasePatterns(quarterReleases);

  return {
    id,
    type: 'tool-deep-dive',
    title: content.title,
    slug,
    publishedAt: new Date().toISOString(),
    summary: content.summary,
    content: content.content,
    coverImageUrl: null,
    tools: [toolId],
    metrics: {
      totalReleases: patterns?.totalReleases || 0,
      releasesByTool: { [toolId]: patterns?.totalReleases || 0 },
      topFeatures: patterns?.notable.map((n) => ({
        tool: toolId,
        feature: n.version,
        description: n.summary,
      })) || [],
      velocityChange: 0,
    },
    seo: {
      keywords: content.keywords || [],
      canonicalUrl: `https://havoptic.com/blog/${slug}`,
    },
  };
}

// Main export function
export async function generateToolDeepDive(toolId, targetQuarter = null) {
  // Default to previous quarter
  const now = new Date();
  let year, quarter;

  if (targetQuarter) {
    year = targetQuarter.year;
    quarter = targetQuarter.quarter;
  } else {
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    if (currentQuarter === 1) {
      year = now.getFullYear() - 1;
      quarter = 4;
    } else {
      year = now.getFullYear();
      quarter = currentQuarter - 1;
    }
  }

  const quarterInfo = { year, quarter, label: `Q${quarter} ${year}` };

  console.log(`\nGenerating deep dive for ${TOOL_DISPLAY_NAMES[toolId]} - ${quarterInfo.label}...`);

  // Load data
  const releasesData = await loadJson(RELEASES_PATH);
  if (!releasesData) {
    throw new Error('Could not load releases.json');
  }

  const githubData = await loadJson(path.join(METRICS_DIR, 'github-stats.json'));
  const npmData = await loadJson(path.join(METRICS_DIR, 'npm-downloads.json'));

  // Get releases for the quarter
  const quarterReleases = getReleasesForQuarter(
    releasesData.releases,
    toolId,
    year,
    quarter
  );

  // Get all releases for the tool
  const allToolReleases = releasesData.releases.filter((r) => r.tool === toolId);

  if (quarterReleases.length === 0) {
    console.log('No releases found for this quarter. Skipping.');
    return null;
  }

  console.log(`Found ${quarterReleases.length} releases`);

  // Initialize Claude client
  const client = new Anthropic();

  // Generate content
  console.log('Generating deep dive content with Claude...');
  const content = await generateDeepDiveContent(
    client,
    toolId,
    quarterReleases,
    allToolReleases,
    { github: githubData, npm: npmData },
    quarterInfo
  );

  if (!content) {
    console.log('Could not generate content.');
    return null;
  }

  // Create blog post
  const blogPost = createBlogPost(content, toolId, quarterReleases, quarterInfo);

  console.log(`Generated: "${blogPost.title}"`);
  console.log(`Slug: ${blogPost.slug}`);

  return blogPost;
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let toolId = null;
  let targetQuarter = null;

  for (const arg of args) {
    if (arg.startsWith('--tool=')) {
      toolId = arg.split('=')[1];
    } else if (arg.startsWith('--quarter=')) {
      // Format: YYYY-Q# (e.g., 2025-Q4)
      const [yearStr, qStr] = arg.split('=')[1].split('-Q');
      targetQuarter = { year: parseInt(yearStr), quarter: parseInt(qStr) };
    }
  }

  if (!toolId) {
    console.error('Usage: node tool-deep-dive.mjs --tool=<tool-id> [--quarter=YYYY-Q#]');
    console.error('Tools: claude-code, openai-codex, cursor, gemini-cli, kiro');
    process.exit(1);
  }

  generateToolDeepDive(toolId, targetQuarter)
    .then((post) => {
      if (post) {
        console.log('\n--- Generated Blog Post ---');
        console.log(JSON.stringify(post, null, 2));
      }
    })
    .catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

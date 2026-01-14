import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const RELEASES_PATH = path.join(DATA_DIR, 'releases.json');
const METRICS_DIR = path.join(DATA_DIR, 'metrics');
const BLOG_PATH = path.join(DATA_DIR, 'blog', 'posts.json');

const TOOL_DISPLAY_NAMES = {
  'claude-code': 'Claude Code',
  'openai-codex': 'OpenAI Codex CLI',
  'cursor': 'Cursor',
  'gemini-cli': 'Gemini CLI',
  'kiro': 'Kiro CLI',
};

// Get month name from date
function getMonthName(date) {
  return date.toLocaleDateString('en-US', { month: 'long' });
}

// Format date as "Month Year"
function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

// Get releases for a specific month
function getReleasesForMonth(releases, year, month) {
  return releases.filter((r) => {
    const date = new Date(r.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

// Calculate metrics for the month
function calculateMonthMetrics(monthReleases, allReleases) {
  const toolIds = ['claude-code', 'openai-codex', 'cursor', 'gemini-cli', 'kiro'];
  const metrics = {
    totalReleases: monthReleases.length,
    releasesByTool: {},
    topFeatures: [],
    velocityChange: 0,
  };

  // Count releases by tool
  for (const toolId of toolIds) {
    metrics.releasesByTool[toolId] = monthReleases.filter((r) => r.tool === toolId).length;
  }

  // Find top features from each tool (based on fullNotes length as proxy)
  for (const toolId of toolIds) {
    const toolReleases = monthReleases.filter((r) => r.tool === toolId);
    if (toolReleases.length > 0) {
      // Sort by notes length (bigger updates first)
      const sorted = toolReleases.sort((a, b) => (b.fullNotes?.length || 0) - (a.fullNotes?.length || 0));
      const topRelease = sorted[0];
      if (topRelease.summary) {
        metrics.topFeatures.push({
          tool: toolId,
          feature: topRelease.summary.slice(0, 100),
          description: topRelease.fullNotes?.slice(0, 200) || topRelease.summary,
        });
      }
    }
  }

  // Calculate velocity change vs previous month
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthReleases = getReleasesForMonth(
    allReleases,
    prevMonth.getFullYear(),
    prevMonth.getMonth()
  );
  if (prevMonthReleases.length > 0) {
    metrics.velocityChange = Math.round(
      ((monthReleases.length - prevMonthReleases.length) / prevMonthReleases.length) * 100
    );
  }

  return metrics;
}

// Generate the blog post content using Claude
async function generateBlogContent(client, monthReleases, metrics, externalMetrics, targetDate) {
  const monthYear = formatMonthYear(targetDate);
  const monthName = getMonthName(targetDate);

  // Build context for Claude
  const releasesSummary = Object.entries(metrics.releasesByTool)
    .filter(([, count]) => count > 0)
    .map(([tool, count]) => `${TOOL_DISPLAY_NAMES[tool]}: ${count} releases`)
    .join('\n');

  const topFeaturesText = metrics.topFeatures
    .map((f) => `- ${TOOL_DISPLAY_NAMES[f.tool]}: ${f.feature}`)
    .join('\n');

  // Get GitHub stats if available
  let githubContext = '';
  if (externalMetrics.github?.tools) {
    const stats = Object.entries(externalMetrics.github.tools)
      .filter(([, data]) => data.github)
      .map(([toolId, data]) => `${TOOL_DISPLAY_NAMES[toolId]}: ${data.github.stars} stars`)
      .join(', ');
    githubContext = `\n\nGitHub Stars: ${stats}`;
  }

  // Get npm stats if available
  let npmContext = '';
  if (externalMetrics.npm?.tools) {
    const stats = Object.entries(externalMetrics.npm.tools)
      .filter(([, data]) => data.npm)
      .map(
        ([toolId, data]) => `${TOOL_DISPLAY_NAMES[toolId]}: ${data.npm.weeklyDownloads.toLocaleString()} weekly downloads`
      )
      .join(', ');
    npmContext = `\n\nNpm Downloads: ${stats}`;
  }

  const systemPrompt = `You are a tech industry analyst writing monthly reports about AI coding tools.
Write engaging, data-driven content that developers will find valuable.
Use a professional but approachable tone. Include specific data points.
Format output as valid JSON with markdown content in the "content" field.

The response must be a JSON object with this exact structure:
{
  "title": "string - engaging title for the post",
  "summary": "string - 150-160 char meta description for SEO",
  "content": "string - full markdown blog post content",
  "keywords": ["array", "of", "seo", "keywords"]
}`;

  const userPrompt = `Write a monthly comparison report for ${monthYear} covering AI coding tools.

Data for ${monthName}:
Total Releases: ${metrics.totalReleases}
${releasesSummary}

Velocity Change: ${metrics.velocityChange > 0 ? '+' : ''}${metrics.velocityChange}% vs previous month

Top Features This Month:
${topFeaturesText}
${githubContext}${npmContext}

Write a report with these sections:
1. Executive Summary (2-3 sentences with key takeaways)
2. Velocity Leaderboard (table showing releases per tool, declare a "winner")
3. Feature Highlights (top 2-3 features from each active tool)
4. GitHub Pulse (if data available - stars, activity)
5. npm Trends (if data available - download patterns)
6. Looking Ahead (brief predictions based on patterns)

Keep it concise but insightful. Use markdown formatting with headers (##), tables, and bullet points.
Focus on what matters to developers choosing between these tools.`;

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

  // Try to extract JSON from the response
  let parsed;
  try {
    // Try direct parse first
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      // Last resort: find first { to last }
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
function createBlogPost(content, metrics, targetDate) {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const monthName = getMonthName(targetDate).toLowerCase();

  const id = `monthly-comparison-${year}-${String(month).padStart(2, '0')}`;
  const slug = `monthly-comparison-${monthName}-${year}`;

  return {
    id,
    type: 'monthly-comparison',
    title: content.title,
    slug,
    publishedAt: new Date().toISOString(),
    summary: content.summary,
    content: content.content,
    coverImageUrl: null, // Can be generated separately
    tools: Object.keys(metrics.releasesByTool).filter((t) => metrics.releasesByTool[t] > 0),
    metrics,
    seo: {
      keywords: content.keywords || [],
      canonicalUrl: `https://havoptic.com/blog/${slug}`,
    },
  };
}

// Main export function
export async function generateMonthlyComparison(targetDate = null) {
  // Default to previous month
  const now = new Date();
  const target = targetDate || new Date(now.getFullYear(), now.getMonth() - 1, 1);

  console.log(`\nGenerating monthly comparison for ${formatMonthYear(target)}...`);

  // Load data
  const releasesData = await loadJson(RELEASES_PATH);
  if (!releasesData) {
    throw new Error('Could not load releases.json');
  }

  const githubData = await loadJson(path.join(METRICS_DIR, 'github-stats.json'));
  const npmData = await loadJson(path.join(METRICS_DIR, 'npm-downloads.json'));

  // Get releases for the target month
  const monthReleases = getReleasesForMonth(
    releasesData.releases,
    target.getFullYear(),
    target.getMonth()
  );

  if (monthReleases.length === 0) {
    console.log('No releases found for this month. Skipping.');
    return null;
  }

  console.log(`Found ${monthReleases.length} releases`);

  // Calculate metrics
  const metrics = calculateMonthMetrics(monthReleases, releasesData.releases);

  // Initialize Claude client
  const client = new Anthropic();

  // Generate content
  console.log('Generating blog content with Claude...');
  const content = await generateBlogContent(
    client,
    monthReleases,
    metrics,
    { github: githubData, npm: npmData },
    target
  );

  // Create blog post
  const blogPost = createBlogPost(content, metrics, target);

  console.log(`Generated: "${blogPost.title}"`);
  console.log(`Slug: ${blogPost.slug}`);
  console.log(`Keywords: ${blogPost.seo.keywords.join(', ')}`);

  return blogPost;
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let targetDate = null;

  for (const arg of args) {
    if (arg.startsWith('--month=')) {
      // Format: YYYY-MM
      const [year, month] = arg.split('=')[1].split('-').map(Number);
      targetDate = new Date(year, month - 1, 1);
    }
  }

  generateMonthlyComparison(targetDate)
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

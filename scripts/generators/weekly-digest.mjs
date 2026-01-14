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

// Get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Get week date range
function getWeekRange(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday

  const format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${format(start)} - ${format(end)}, ${start.getFullYear()}`;
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

// Get releases for a specific week
function getReleasesForWeek(releases, targetDate) {
  const startOfWeek = new Date(targetDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return releases.filter((r) => {
    const date = new Date(r.date);
    return date >= startOfWeek && date < endOfWeek;
  });
}

// Get previous week's releases for comparison
function getPreviousWeekReleases(releases, targetDate) {
  const prevWeek = new Date(targetDate);
  prevWeek.setDate(prevWeek.getDate() - 7);
  return getReleasesForWeek(releases, prevWeek);
}

// Generate the weekly digest content using Claude
async function generateDigestContent(client, weekReleases, prevWeekReleases, velocityData, targetDate) {
  const weekRange = getWeekRange(targetDate);
  const weekNum = getWeekNumber(targetDate);
  const year = targetDate.getFullYear();

  // Group releases by tool
  const byTool = {};
  for (const release of weekReleases) {
    if (!byTool[release.tool]) byTool[release.tool] = [];
    byTool[release.tool].push(release);
  }

  // Build releases summary
  const releasesList = Object.entries(byTool)
    .map(([toolId, releases]) => {
      const versions = releases.map((r) => `v${r.version}`).join(', ');
      const features = releases.map((r) => r.summary).slice(0, 2).join('; ');
      return `${TOOL_DISPLAY_NAMES[toolId]} (${releases.length}): ${versions}\n  Features: ${features}`;
    })
    .join('\n\n');

  // Calculate velocity trend
  const velocityChange = prevWeekReleases.length > 0
    ? Math.round(((weekReleases.length - prevWeekReleases.length) / prevWeekReleases.length) * 100)
    : 0;

  // Find the highlight (biggest release by notes length)
  const allReleases = [...weekReleases].sort((a, b) => (b.fullNotes?.length || 0) - (a.fullNotes?.length || 0));
  const highlight = allReleases[0];

  const systemPrompt = `You are a tech journalist writing a quick weekly digest about AI coding tools.
Write punchy, scannable content that busy developers can skim quickly.
Use a conversational, newsletter-style tone.
Format output as valid JSON with markdown content in the "content" field.

The response must be a JSON object with this exact structure:
{
  "title": "string - catchy title mentioning the week",
  "summary": "string - 150-160 char teaser for email/social",
  "content": "string - full markdown blog post content",
  "keywords": ["array", "of", "seo", "keywords"]
}`;

  const userPrompt = `Write a weekly digest for Week ${weekNum} of ${year} (${weekRange}).

This Week's Releases (${weekReleases.length} total):
${releasesList}

Velocity Trend: ${velocityChange > 0 ? '+' : ''}${velocityChange}% vs last week
Last Week: ${prevWeekReleases.length} releases

Highlight of the Week:
${highlight ? `${TOOL_DISPLAY_NAMES[highlight.tool]} ${highlight.version}: ${highlight.summary}` : 'No major releases'}

Write a digest with these sections:
1. TL;DR (2 bullet points max - what matters this week)
2. This Week's Releases (quick hits per tool, use ### headers)
3. Highlight Deep Dive (1 paragraph on the biggest feature)
4. Quick Stats (total releases, biggest mover, velocity trend)

Keep it SHORT - aim for 400-600 words max. Developers are busy.
Use emojis sparingly for visual scanning (once per section max).`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
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
function createBlogPost(content, weekReleases, targetDate) {
  const year = targetDate.getFullYear();
  const weekNum = getWeekNumber(targetDate);

  const id = `weekly-digest-${year}-w${String(weekNum).padStart(2, '0')}`;
  const slug = `weekly-digest-week-${weekNum}-${year}`;

  // Calculate metrics
  const releasesByTool = {};
  for (const release of weekReleases) {
    releasesByTool[release.tool] = (releasesByTool[release.tool] || 0) + 1;
  }

  return {
    id,
    type: 'weekly-digest',
    title: content.title,
    slug,
    publishedAt: new Date().toISOString(),
    summary: content.summary,
    content: content.content,
    coverImageUrl: null,
    tools: [...new Set(weekReleases.map((r) => r.tool))],
    metrics: {
      totalReleases: weekReleases.length,
      releasesByTool,
      topFeatures: weekReleases.slice(0, 3).map((r) => ({
        tool: r.tool,
        feature: r.version,
        description: r.summary,
      })),
      velocityChange: 0,
    },
    seo: {
      keywords: content.keywords || [],
      canonicalUrl: `https://havoptic.com/blog/${slug}`,
    },
  };
}

// Main export function
export async function generateWeeklyDigest(targetDate = null) {
  // Default to last week (previous Monday)
  const now = new Date();
  const target = targetDate || new Date(now.setDate(now.getDate() - 7));

  console.log(`\nGenerating weekly digest for ${getWeekRange(target)}...`);

  // Load data
  const releasesData = await loadJson(RELEASES_PATH);
  if (!releasesData) {
    throw new Error('Could not load releases.json');
  }

  const velocityData = await loadJson(path.join(METRICS_DIR, 'velocity.json'));

  // Get releases for the target week
  const weekReleases = getReleasesForWeek(releasesData.releases, target);
  const prevWeekReleases = getPreviousWeekReleases(releasesData.releases, target);

  if (weekReleases.length === 0) {
    console.log('No releases found for this week. Skipping.');
    return null;
  }

  console.log(`Found ${weekReleases.length} releases (prev week: ${prevWeekReleases.length})`);

  // Initialize Claude client
  const client = new Anthropic();

  // Generate content
  console.log('Generating digest content with Claude...');
  const content = await generateDigestContent(
    client,
    weekReleases,
    prevWeekReleases,
    velocityData,
    target
  );

  // Create blog post
  const blogPost = createBlogPost(content, weekReleases, target);

  console.log(`Generated: "${blogPost.title}"`);
  console.log(`Slug: ${blogPost.slug}`);

  return blogPost;
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let targetDate = null;

  for (const arg of args) {
    if (arg.startsWith('--date=')) {
      // Format: YYYY-MM-DD (any day in the target week)
      targetDate = new Date(arg.split('=')[1]);
    }
  }

  generateWeeklyDigest(targetDate)
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

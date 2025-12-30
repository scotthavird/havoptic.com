import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'infographics');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Tool-specific colors matching the Tailwind config
const TOOL_COLORS = {
  'claude-code': { primary: '#D97706', secondary: '#FEF3C7', text: '#78350F' },
  'openai-codex': { primary: '#059669', secondary: '#D1FAE5', text: '#064E3B' },
  'cursor': { primary: '#7C3AED', secondary: '#EDE9FE', text: '#4C1D95' },
  'gemini-cli': { primary: '#00ACC1', secondary: '#E0F7FA', text: '#006064' },
  'kiro': { primary: '#8B5CF6', secondary: '#EDE9FE', text: '#5B21B6' },
};

// GitHub repo mappings for each tool
const TOOL_REPOS = {
  'gemini-cli': 'google-gemini/gemini-cli',
  'openai-codex': 'openai/codex',
  'claude-code': 'anthropics/claude-code',
};

/**
 * Fetch commits between two tags/releases for a GitHub repo
 */
async function fetchCommitsBetweenReleases(repo, fromTag, toTag) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'havoptic-infographic-generator',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    // Get comparison between tags
    const url = `https://api.github.com/repos/${repo}/compare/${fromTag}...${toTag}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.log(`  Could not fetch commits: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.commits || [];
  } catch (err) {
    console.error(`  Error fetching commits: ${err.message}`);
    return [];
  }
}

/**
 * Fetch detailed release info including body/notes
 */
async function fetchReleaseDetails(repo, tag) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'havoptic-infographic-generator',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    const url = `https://api.github.com/repos/${repo}/releases/tags/${tag}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`  Error fetching release details: ${err.message}`);
    return null;
  }
}

/**
 * Parse release notes into feature categories
 */
function parseReleaseNotes(body) {
  if (!body) return { features: [], fixes: [], other: [] };

  const features = [];
  const fixes = [];
  const other = [];

  const lines = body.split('\n');
  let currentCategory = 'other';

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect category headers
    if (/feat|feature|new|add/i.test(trimmed) && trimmed.includes(':')) {
      currentCategory = 'features';
    } else if (/fix|bug|patch/i.test(trimmed) && trimmed.includes(':')) {
      currentCategory = 'fixes';
    }

    // Extract bullet points
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      const item = bulletMatch[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
        .replace(/`([^`]+)`/g, '$1') // Remove code formatting
        .replace(/by @[\w-]+.*$/i, '') // Remove author attribution
        .replace(/\(#\d+\)$/, '') // Remove PR numbers
        .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
        .trim();

      if (item.length > 10 && item.length < 100) {
        if (currentCategory === 'features') {
          features.push(item);
        } else if (currentCategory === 'fixes') {
          fixes.push(item);
        } else {
          other.push(item);
        }
      }
    }
  }

  return { features, fixes, other };
}

/**
 * Generate SVG infographic for a release
 */
function generateSVG(release, releaseDetails, commits) {
  const colors = TOOL_COLORS[release.tool] || TOOL_COLORS['gemini-cli'];
  const parsed = parseReleaseNotes(releaseDetails?.body || release.summary);

  // Combine all items for display
  const allItems = [
    ...parsed.features.map(f => ({ text: f, type: 'feature' })),
    ...parsed.fixes.map(f => ({ text: f, type: 'fix' })),
    ...parsed.other.slice(0, 3).map(f => ({ text: f, type: 'other' })),
  ].slice(0, 12); // Max 12 items for layout

  // Calculate grid dimensions
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(allItems.length))));
  const rows = Math.ceil(allItems.length / cols);

  const cellWidth = 220;
  const cellHeight = 120;
  const padding = 20;
  const headerHeight = 100;

  const width = cols * cellWidth + padding * 2;
  const height = rows * cellHeight + headerHeight + padding * 2;

  // Format date
  const date = new Date(release.date);
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Build SVG
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      .title { font: bold 28px system-ui, -apple-system, sans-serif; fill: ${colors.text}; }
      .subtitle { font: 16px system-ui, -apple-system, sans-serif; fill: ${colors.primary}; }
      .cell-text { font: 13px system-ui, -apple-system, sans-serif; fill: ${colors.text}; }
      .cell-icon { font: 20px system-ui, sans-serif; }
      .version-badge { font: bold 14px system-ui, -apple-system, sans-serif; fill: white; }
    </style>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.1"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${colors.secondary}" rx="16"/>

  <!-- Header -->
  <text x="${padding + 10}" y="${padding + 35}" class="title">${release.toolDisplayName}</text>
  <text x="${padding + 10}" y="${padding + 60}" class="subtitle">${dateStr}</text>

  <!-- Version badge -->
  <rect x="${width - 120 - padding}" y="${padding + 10}" width="110" height="32" rx="16" fill="${colors.primary}"/>
  <text x="${width - 65 - padding}" y="${padding + 32}" class="version-badge" text-anchor="middle">${release.version}</text>
`;

  // Generate grid cells
  allItems.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = padding + col * cellWidth + 10;
    const y = headerHeight + padding + row * cellHeight;

    // Icon based on type
    const icon = item.type === 'feature' ? '✨' : item.type === 'fix' ? '🔧' : '📝';

    // Truncate text to fit
    const maxChars = 60;
    const displayText = item.text.length > maxChars
      ? item.text.substring(0, maxChars - 3) + '...'
      : item.text;

    // Word wrap
    const words = displayText.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length > 25) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    svg += `
  <!-- Cell ${index + 1} -->
  <rect x="${x}" y="${y}" width="${cellWidth - 20}" height="${cellHeight - 15}" rx="12" fill="white" filter="url(#shadow)"/>
  <text x="${x + 12}" y="${y + 28}" class="cell-icon">${icon}</text>
`;

    lines.slice(0, 4).forEach((line, lineIndex) => {
      svg += `  <text x="${x + 12}" y="${y + 52 + lineIndex * 18}" class="cell-text">${escapeXml(line)}</text>\n`;
    });
  });

  // Footer with commit count if available
  if (commits.length > 0) {
    svg += `
  <!-- Footer -->
  <text x="${width / 2}" y="${height - 15}" class="subtitle" text-anchor="middle" opacity="0.7">${commits.length} commits in this release</text>
`;
  }

  svg += `</svg>`;

  return svg;
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate infographic for a specific release
 */
async function generateInfographic(release, previousRelease) {
  const repo = TOOL_REPOS[release.tool];
  if (!repo) {
    console.log(`  No GitHub repo configured for ${release.tool}`);
    return null;
  }

  console.log(`  Fetching details for ${release.version}...`);

  // Fetch release details
  const releaseDetails = await fetchReleaseDetails(repo, release.version);

  // Fetch commits if we have a previous release to compare
  let commits = [];
  if (previousRelease) {
    commits = await fetchCommitsBetweenReleases(repo, previousRelease.version, release.version);
  }

  // Generate SVG
  const svg = generateSVG(release, releaseDetails, commits);

  return svg;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const toolFilter = args.find(a => a.startsWith('--tool='))?.split('=')[1];
  const versionFilter = args.find(a => a.startsWith('--version='))?.split('=')[1];
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? parseInt(limitArg, 10) : 1;

  console.log('Generating release infographics...\n');

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Load releases data
  let releasesData;
  try {
    const content = await fs.readFile(DATA_PATH, 'utf-8');
    releasesData = JSON.parse(content);
  } catch (err) {
    console.error('Error reading releases.json:', err.message);
    process.exit(1);
  }

  // Filter releases
  let releases = releasesData.releases;

  if (toolFilter) {
    releases = releases.filter(r => r.tool === toolFilter);
  }

  if (versionFilter) {
    releases = releases.filter(r => r.version === versionFilter);
  }

  // Group by tool for finding previous versions
  const byTool = {};
  for (const r of releasesData.releases) {
    if (!byTool[r.tool]) byTool[r.tool] = [];
    byTool[r.tool].push(r);
  }

  // Sort each tool's releases by date
  for (const tool of Object.keys(byTool)) {
    byTool[tool].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Generate infographics
  const toGenerate = releases.slice(0, limit);
  console.log(`Generating ${toGenerate.length} infographic(s)...\n`);

  for (const release of toGenerate) {
    console.log(`Processing ${release.toolDisplayName} ${release.version}...`);

    // Find previous release
    const toolReleases = byTool[release.tool] || [];
    const currentIndex = toolReleases.findIndex(r => r.id === release.id);
    const previousRelease = currentIndex >= 0 ? toolReleases[currentIndex + 1] : null;

    const svg = await generateInfographic(release, previousRelease);

    if (svg) {
      const filename = `${release.tool}-${release.version.replace(/[^a-z0-9.-]/gi, '-')}.svg`;
      const outputPath = path.join(OUTPUT_DIR, filename);
      await fs.writeFile(outputPath, svg);
      console.log(`  ✓ Generated: ${filename}\n`);
    }
  }

  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

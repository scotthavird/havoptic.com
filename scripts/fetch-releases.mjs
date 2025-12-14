import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Utility: extract first N characters as summary, breaking at sentence/bullet
function extractSummary(text, maxLength = 200) {
  if (!text) return '';
  // Remove markdown links
  let clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove markdown formatting
  clean = clean.replace(/[*_`#]/g, '');
  // Take first paragraph or bullet points
  const lines = clean.split('\n').filter(l => l.trim());
  let summary = lines.slice(0, 2).join(' ').trim();
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }
  return summary;
}

// Fetch Claude Code releases from npm + CHANGELOG.md
async function fetchClaudeCode(existingIds) {
  console.log('Fetching Claude Code releases...');
  const releases = [];

  try {
    // Get version dates from npm registry
    const npmRes = await fetch('https://registry.npmjs.org/@anthropic-ai/claude-code');
    if (!npmRes.ok) throw new Error(`npm registry returned ${npmRes.status}`);
    const npmData = await npmRes.json();
    const versionDates = npmData.time || {};

    // Get changelog content
    const mdRes = await fetch('https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md');
    if (!mdRes.ok) throw new Error(`CHANGELOG.md fetch returned ${mdRes.status}`);
    const markdown = await mdRes.text();

    // Parse changelog - look for ## version headers
    const versionRegex = /^## (\d+\.\d+\.\d+(?:-[a-z0-9.]+)?)\s*\n([\s\S]*?)(?=^## \d|\z)/gm;
    let match;

    while ((match = versionRegex.exec(markdown)) !== null) {
      const version = match[1];
      const content = match[2].trim();
      const id = `claude-code-${version}`;

      if (existingIds.has(id)) continue;

      // Get date from npm, fall back to null
      const date = versionDates[version] || null;
      if (!date) {
        console.log(`  Skipping ${version} - no date in npm registry`);
        continue;
      }

      releases.push({
        id,
        tool: 'claude-code',
        toolDisplayName: 'Claude Code',
        version,
        date,
        summary: extractSummary(content),
        url: 'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md',
        type: version.includes('-') ? 'prerelease' : 'release',
      });
    }

    console.log(`  Found ${releases.length} new Claude Code releases`);
  } catch (err) {
    console.error('  Error fetching Claude Code:', err.message);
  }

  return releases;
}

// Fetch OpenAI Codex CLI releases from GitHub API
async function fetchOpenAICodex(existingIds) {
  console.log('Fetching OpenAI Codex CLI releases...');
  const releases = [];
  let page = 1;
  const perPage = 100;

  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'havoptic-release-tracker',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    while (true) {
      const url = `https://api.github.com/repos/openai/codex/releases?per_page=${perPage}&page=${page}`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status === 403) {
          console.log('  Rate limited by GitHub API');
          break;
        }
        throw new Error(`GitHub API returned ${res.status}`);
      }

      const data = await res.json();
      if (data.length === 0) break;

      for (const release of data) {
        const version = release.tag_name;
        const id = `openai-codex-${version}`;

        if (existingIds.has(id)) continue;

        releases.push({
          id,
          tool: 'openai-codex',
          toolDisplayName: 'OpenAI Codex CLI',
          version,
          date: release.published_at,
          summary: extractSummary(release.body),
          url: release.html_url,
          type: release.prerelease ? 'prerelease' : 'release',
        });
      }

      // Check if we've hit rate limit or end
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining && parseInt(remaining) < 5) {
        console.log('  Approaching rate limit, stopping pagination');
        break;
      }

      page++;
    }

    console.log(`  Found ${releases.length} new OpenAI Codex releases`);
  } catch (err) {
    console.error('  Error fetching OpenAI Codex:', err.message);
  }

  return releases;
}

// Fetch Cursor releases by scraping changelog page
async function fetchCursor(existingIds) {
  console.log('Fetching Cursor releases...');
  const releases = [];

  try {
    const res = await fetch('https://www.cursor.com/changelog', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) throw new Error(`Cursor changelog returned ${res.status}`);

    const html = await res.text();
    const $ = load(html);

    // Cursor uses article elements with span.label for version and time[dateTime] for date
    $('article').each((_, el) => {
      const $el = $(el);

      // Version is in span.label
      const versionSpan = $el.find('span.label').first();
      const versionText = versionSpan.text().trim();
      const versionMatch = versionText.match(/(\d+\.\d+(?:\.\d+)?)/);

      if (!versionMatch) return;

      const version = versionMatch[1];
      const id = `cursor-${version}`;

      if (existingIds.has(id)) return;

      // Date is in time element with dateTime attribute
      const timeEl = $el.find('time');
      const dateStr = timeEl.attr('datetime') || timeEl.attr('dateTime');

      if (!dateStr) return;

      // Summary from h1.type-lg (feature headline)
      const headline = $el.find('h1').first().text().trim();
      // Or from h3 elements
      const h3s = $el.find('h3').map((_, h3) => $(h3).text().trim()).get().slice(0, 2);
      const summary = headline || h3s.join(', ') || `Cursor version ${version}`;

      releases.push({
        id,
        tool: 'cursor',
        toolDisplayName: 'Cursor',
        version,
        date: new Date(dateStr).toISOString(),
        summary: extractSummary(summary),
        url: 'https://www.cursor.com/changelog',
        type: 'release',
      });
    });

    console.log(`  Found ${releases.length} new Cursor releases`);
  } catch (err) {
    console.error('  Error fetching Cursor:', err.message);
  }

  return releases;
}

async function main() {
  console.log('Starting release fetch...\n');

  // Load existing data
  let existingData = { lastUpdated: null, releases: [] };
  try {
    const content = await fs.readFile(DATA_PATH, 'utf-8');
    existingData = JSON.parse(content);
    console.log(`Loaded ${existingData.releases.length} existing releases\n`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error reading existing data:', err.message);
    }
    console.log('Starting with empty data\n');
  }

  const existingIds = new Set(existingData.releases.map(r => r.id));

  // Fetch from all sources
  const [claudeReleases, codexReleases, cursorReleases] = await Promise.all([
    fetchClaudeCode(existingIds),
    fetchOpenAICodex(existingIds),
    fetchCursor(existingIds),
  ]);

  // Merge and sort
  const allNew = [...claudeReleases, ...codexReleases, ...cursorReleases];
  console.log(`\nTotal new releases found: ${allNew.length}`);

  if (allNew.length === 0) {
    console.log('No new releases to add.');
    // Still update lastUpdated
    existingData.lastUpdated = new Date().toISOString();
    await fs.writeFile(DATA_PATH, JSON.stringify(existingData, null, 2));
    return;
  }

  // Combine with existing, sort by date descending
  const combined = [...allNew, ...existingData.releases].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Write output
  const output = {
    lastUpdated: new Date().toISOString(),
    releases: combined,
  };

  await fs.writeFile(DATA_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWritten ${combined.length} total releases to ${DATA_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

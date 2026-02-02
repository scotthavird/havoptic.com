import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const SITEMAP_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Utility: clean markdown text for storage
function cleanMarkdown(text) {
  if (!text) return '';
  // Remove markdown links but keep text
  let clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove markdown formatting
  clean = clean.replace(/[*_`#]/g, '');
  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// Utility: extract first N characters as summary, breaking at sentence/bullet
function extractSummary(text, maxLength = 200) {
  const clean = cleanMarkdown(text);
  if (!clean) return '';
  // Take first portion
  if (clean.length > maxLength) {
    return clean.substring(0, maxLength - 3) + '...';
  }
  return clean;
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
        fullNotes: cleanMarkdown(content),
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
        // Skip prereleases (alpha/beta versions)
        if (release.prerelease) continue;

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
          fullNotes: cleanMarkdown(release.body),
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

// Fetch Gemini CLI releases from GitHub API
async function fetchGeminiCLI(existingIds) {
  console.log('Fetching Gemini CLI releases...');
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
      const url = `https://api.github.com/repos/google-gemini/gemini-cli/releases?per_page=${perPage}&page=${page}`;
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
        // Skip prereleases (nightly/preview versions)
        if (release.prerelease) continue;

        const version = release.tag_name;
        const id = `gemini-cli-${version}`;

        if (existingIds.has(id)) continue;

        releases.push({
          id,
          tool: 'gemini-cli',
          toolDisplayName: 'Gemini CLI',
          version,
          date: release.published_at,
          summary: extractSummary(release.body),
          fullNotes: cleanMarkdown(release.body),
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

    console.log(`  Found ${releases.length} new Gemini CLI releases`);
  } catch (err) {
    console.error('  Error fetching Gemini CLI:', err.message);
  }

  return releases;
}

// Fetch Kiro CLI releases by scraping changelog page
async function fetchKiro(existingIds) {
  console.log('Fetching Kiro CLI releases...');
  const releases = [];
  const seenIds = new Set();

  try {
    const res = await fetch('https://kiro.dev/changelog/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) throw new Error(`Kiro changelog returned ${res.status}`);

    const html = await res.text();

    // Strategy 1: Extract from CLI changelog URLs (most reliable)
    // Pattern: /changelog/cli/X-YY/ -> version X.YY.0
    const cliUrlPattern = /\/changelog\/cli\/(\d+)-(\d+)\//g;
    const cliVersions = new Map(); // version -> url
    let match;
    while ((match = cliUrlPattern.exec(html)) !== null) {
      const major = match[1];
      const minor = match[2];
      const version = `${major}.${minor}.0`;
      const url = `https://kiro.dev/changelog/cli/${major}-${minor}/`;
      if (!cliVersions.has(version)) {
        cliVersions.set(version, url);
      }
    }

    // Strategy 2: Also look for patch versions (X.YY.Z pattern with publishedDate)
    // Pattern handles both escaped (JSON) and unescaped quotes: "X.YY.Z","publishedDate":"YYYY-MM-DD..."
    // The HTML contains escaped JSON like: \"1.24.0\",\"publishedDate\":\"2026-01-16T00:00-05:00\"
    const jsonVersionPattern = /\\?"(\d+\.\d+\.\d+)\\?",\\?"publishedDate\\?":\\?"([^"\\]+)/g;
    const versionDates = new Map(); // version -> date
    while ((match = jsonVersionPattern.exec(html)) !== null) {
      const version = match[1];
      const date = match[2];
      // Only track versions that look like CLI versions (1.x.x range)
      if (version.startsWith('1.') && parseInt(version.split('.')[1]) >= 20) {
        versionDates.set(version, date);
      }
    }

    // Strategy 3: Check for patch version URLs (e.g., #patch-1-23-1)
    const patchUrlPattern = /#patch-(\d+)-(\d+)-(\d+)/g;
    while ((match = patchUrlPattern.exec(html)) !== null) {
      const major = match[1];
      const minor = match[2];
      const patch = match[3];
      const version = `${major}.${minor}.${patch}`;
      const url = `https://kiro.dev/changelog/cli/${major}-${minor}/#patch-${major}-${minor}-${patch}`;
      if (!cliVersions.has(version)) {
        cliVersions.set(version, url);
      }
    }

    // Also extract dates from "Month DD, YYYY" format (full and abbreviated) near versions
    const fullMonths = 'January|February|March|April|May|June|July|August|September|October|November|December';
    const abbrMonths = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
    const textDatePattern = new RegExp(`((?:${fullMonths}|${abbrMonths})\\s+\\d{1,2},?\\s+\\d{4})`, 'g');
    const textDates = [];
    while ((match = textDatePattern.exec(html)) !== null) {
      textDates.push({ date: match[1], index: match.index });
    }

    // Strategy 4: Look for patch versions with nearby dates in HTML
    // Pattern: version number followed by abbreviated date like ">1.23.1</span><span...>Dec 23, 2025"
    // Use a more flexible pattern that allows HTML tags between version and date
    const patchDatePattern = />(\d+\.\d+\.\d+)<\/span>[\s\S]{0,200}>((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/g;
    while ((match = patchDatePattern.exec(html)) !== null) {
      const version = match[1];
      const dateStr = match[2];
      if (version.startsWith('1.') && parseInt(version.split('.')[1]) >= 20) {
        if (!versionDates.has(version)) {
          versionDates.set(version, dateStr);
        }
      }
    }

    // Build releases from collected data
    for (const [version, url] of cliVersions) {
      const id = `kiro-${version}`;

      if (seenIds.has(id) || existingIds.has(id)) continue;
      seenIds.add(id);

      // Try to find date from JSON data first
      let releaseDate = versionDates.get(version);

      // If no JSON date found, look for text date near the URL in HTML
      if (!releaseDate) {
        const urlIndex = html.indexOf(url.replace('https://kiro.dev', ''));
        if (urlIndex > -1) {
          // Find closest date within 2000 chars before the URL
          for (let i = textDates.length - 1; i >= 0; i--) {
            const d = textDates[i];
            if (d.index < urlIndex && urlIndex - d.index < 2000) {
              releaseDate = new Date(d.date).toISOString();
              break;
            }
          }
        }
      }

      // Parse date string to ISO format if needed
      if (releaseDate && !releaseDate.includes('T')) {
        releaseDate = new Date(releaseDate).toISOString();
      }

      if (!releaseDate) {
        console.log(`  Skipping ${version} - no date found`);
        continue;
      }

      releases.push({
        id,
        tool: 'kiro',
        toolDisplayName: 'Kiro CLI',
        version,
        date: releaseDate,
        summary: `Kiro CLI version ${version}`,
        fullNotes: `Kiro CLI version ${version}`, // Full notes fetched at infographic generation time from URL
        url,
        type: 'release',
      });
    }

    console.log(`  Found ${releases.length} new Kiro CLI releases`);
  } catch (err) {
    console.error('  Error fetching Kiro CLI:', err.message);
  }

  return releases;
}

// Fetch GitHub Copilot CLI releases from GitHub API
async function fetchGitHubCopilot(existingIds) {
  console.log('Fetching GitHub Copilot CLI releases...');
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
      const url = `https://api.github.com/repos/github/copilot-cli/releases?per_page=${perPage}&page=${page}`;
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
        // Skip prereleases (alpha/beta versions)
        if (release.prerelease) continue;

        const version = release.tag_name;
        const id = `github-copilot-${version}`;

        if (existingIds.has(id)) continue;

        releases.push({
          id,
          tool: 'github-copilot',
          toolDisplayName: 'GitHub Copilot CLI',
          version,
          date: release.published_at,
          summary: extractSummary(release.body),
          fullNotes: cleanMarkdown(release.body),
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

    console.log(`  Found ${releases.length} new GitHub Copilot CLI releases`);
  } catch (err) {
    console.error('  Error fetching GitHub Copilot CLI:', err.message);
  }

  return releases;
}

// Fetch Windsurf releases by scraping changelog page
async function fetchWindsurf(existingIds) {
  console.log('Fetching Windsurf releases...');
  const releases = [];
  const seenIds = new Set();

  try {
    const res = await fetch('https://windsurf.com/changelog', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) throw new Error(`Windsurf changelog returned ${res.status}`);

    const html = await res.text();
    const $ = load(html);

    // Windsurf changelog has entries with version numbers and dates
    // Look for version patterns like "1.13.9" and dates like "January 16, 2026"

    // Extract version entries - they appear to be in sections with version numbers and dates
    const versionPattern = /(\d+\.\d+\.\d+)/g;
    const datePattern = /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/g;

    // Find all sections that look like changelog entries
    // Try different selectors that commonly hold changelog entries
    const entries = [];

    // Look for elements containing version numbers
    $('*').each((_, el) => {
      const text = $(el).text();
      const versionMatch = text.match(/^(\d+\.\d+\.\d+)$/);
      if (versionMatch) {
        entries.push({
          element: el,
          version: versionMatch[1],
          text: text
        });
      }
    });

    // Also try to parse from raw HTML using regex for more reliable extraction
    const htmlMatches = [];
    let match;

    // Find all versions with their approximate positions
    const versions = [];
    const tempVersionPattern = /(\d+\.\d+\.\d+)/g;
    while ((match = tempVersionPattern.exec(html)) !== null) {
      versions.push({ version: match[1], index: match.index });
    }

    // Find all dates with their approximate positions
    const dates = [];
    const tempDatePattern = /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/g;
    while ((match = tempDatePattern.exec(html)) !== null) {
      dates.push({ date: match[1], index: match.index });
    }

    // Match versions to their nearest dates
    for (const ver of versions) {
      const id = `windsurf-${ver.version}`;

      if (seenIds.has(id) || existingIds.has(id)) continue;
      seenIds.add(id);

      // Find the closest date that appears near this version (within 500 chars)
      let closestDate = null;
      let minDist = Infinity;
      for (const d of dates) {
        const dist = Math.abs(d.index - ver.index);
        if (dist < minDist && dist < 500) {
          minDist = dist;
          closestDate = d.date;
        }
      }

      if (!closestDate) continue;

      releases.push({
        id,
        tool: 'windsurf',
        toolDisplayName: 'Windsurf',
        version: ver.version,
        date: new Date(closestDate).toISOString(),
        summary: `Windsurf version ${ver.version}`,
        fullNotes: `Windsurf version ${ver.version}`, // Full notes fetched at infographic generation time
        url: 'https://windsurf.com/changelog',
        type: 'release',
      });
    }

    console.log(`  Found ${releases.length} new Windsurf releases`);
  } catch (err) {
    console.error('  Error fetching Windsurf:', err.message);
  }

  return releases;
}

// Fetch Cursor releases by scraping changelog page
async function fetchCursor(existingIds) {
  console.log('Fetching Cursor releases...');
  const releases = [];
  const seenIds = new Set(); // Track IDs seen in this fetch to prevent duplicates

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

      // Skip if already seen in this fetch or exists in file
      if (seenIds.has(id) || existingIds.has(id)) return;
      seenIds.add(id);

      // Date is in time element with dateTime attribute
      const timeEl = $el.find('time');
      const dateStr = timeEl.attr('datetime') || timeEl.attr('dateTime');

      if (!dateStr) return;

      // Try to find the link to the detailed changelog page
      // Pattern: /changelog/2-3 for version 2.3
      const articleLink = $el.find('a[href^="/changelog/"]').first();
      let releaseUrl = 'https://www.cursor.com/changelog';
      if (articleLink.length) {
        const href = articleLink.attr('href');
        releaseUrl = `https://www.cursor.com${href}`;
      } else {
        // Construct URL from version: 2.3 -> /changelog/2-3
        const versionSlug = version.replace(/\./g, '-');
        releaseUrl = `https://www.cursor.com/changelog/${versionSlug}`;
      }

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
        fullNotes: summary, // Full notes fetched at infographic generation time from URL
        url: releaseUrl,
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
  const [claudeReleases, codexReleases, cursorReleases, geminiReleases, kiroReleases, copilotReleases, windsurfReleases] = await Promise.all([
    fetchClaudeCode(existingIds),
    fetchOpenAICodex(existingIds),
    fetchCursor(existingIds),
    fetchGeminiCLI(existingIds),
    fetchKiro(existingIds),
    fetchGitHubCopilot(existingIds),
    fetchWindsurf(existingIds),
  ]);

  // Merge and sort
  const allNew = [...claudeReleases, ...codexReleases, ...cursorReleases, ...geminiReleases, ...kiroReleases, ...copilotReleases, ...windsurfReleases];
  console.log(`\nTotal new releases found: ${allNew.length}`);

  if (allNew.length === 0) {
    console.log('No new releases to add.');
    // Still update lastUpdated
    existingData.lastUpdated = new Date().toISOString();
    await fs.writeFile(DATA_PATH, JSON.stringify(existingData, null, 2));
    return;
  }

  // Combine with existing, deduplicate by id, sort by date descending
  const combinedMap = new Map();
  for (const release of [...existingData.releases, ...allNew]) {
    combinedMap.set(release.id, release); // Later entries (new) overwrite older
  }
  const combined = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Write output
  const output = {
    lastUpdated: new Date().toISOString(),
    releases: combined,
  };

  await fs.writeFile(DATA_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWritten ${combined.length} total releases to ${DATA_PATH}`);

  // Update sitemap.xml with current date
  await updateSitemap();
}

async function updateSitemap() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://havoptic.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  await fs.writeFile(SITEMAP_PATH, sitemapContent);
  console.log(`Updated sitemap.xml with lastmod: ${today}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

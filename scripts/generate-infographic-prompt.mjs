import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'generated-prompts');
const PUBLIC_IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'infographics');

// Nano Banana Pro (Gemini 3 Pro Image) - premium model for high-quality infographics
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

// Tool configurations for infographic styling
const TOOL_CONFIGS = {
  'claude-code': {
    displayName: 'CLAUDE CODE',
    primaryColor: '#8B5CF6',
    style: 'Purple/coral gradient, dark background with subtle grid pattern, modern tech aesthetic',
  },
  'kiro': {
    displayName: 'KIRO',
    primaryColor: '#8B5CF6',
    style: 'Purple accent, dark gradient background, cloud-native professional aesthetic',
  },
  'openai-codex': {
    displayName: 'CODEX CLI',
    primaryColor: '#059669',
    style: 'Emerald green accent, black background, minimalist terminal aesthetic',
  },
  'gemini-cli': {
    displayName: 'GEMINI CLI',
    primaryColor: '#00ACC1',
    style: 'Teal/cyan accent, dark background, clean Material Design',
  },
  'cursor': {
    displayName: 'CURSOR',
    primaryColor: '#7c3aed',
    style: 'Purple glassmorphism, dark gradient background, IDE-inspired modern aesthetic',
  },
  'github-copilot': {
    displayName: 'GITHUB COPILOT CLI',
    primaryColor: '#8534F3',
    style: 'Copilot purple accent, dark gradient background, GitHub-inspired modern developer aesthetic',
  },
  'windsurf': {
    displayName: 'WINDSURF',
    primaryColor: '#00D4AA',
    style: 'Teal/cyan accent, dark gradient background, modern IDE-inspired aesthetic with wave motif',
  },
};

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
};

// Error patterns that indicate Claude returned an error message as a feature
const ERROR_PATTERNS = [
  /unable to extract/i,
  /not available/i,
  /could not find/i,
  /no .* found/i,
  /content not available/i,
  /release notes content/i,
  /cannot extract/i,
  /insufficient .* content/i,
];

// Validate that extracted features are actual features, not error messages
function validateFeatures(features) {
  if (!features || !features.features || !Array.isArray(features.features)) {
    return { valid: false, reason: 'Invalid features structure: missing features array' };
  }

  if (features.features.length === 0) {
    return { valid: false, reason: 'No features extracted' };
  }

  for (const feature of features.features) {
    if (!feature.name || !feature.description) {
      return { valid: false, reason: `Feature missing name or description: ${JSON.stringify(feature)}` };
    }

    const text = `${feature.name} ${feature.description}`;

    // Check for error patterns
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.test(text)) {
        return { valid: false, reason: `Feature contains error pattern: "${text}"` };
      }
    }

    // Check for minimum meaningful content
    if (feature.name.length < 3 || feature.description.length < 5) {
      return { valid: false, reason: `Feature has insufficient content: name="${feature.name}", desc="${feature.description}"` };
    }
  }

  return { valid: true };
}

// Retry wrapper with exponential backoff
async function withRetry(fn, options = {}) {
  const { maxAttempts = RETRY_CONFIG.maxAttempts, baseDelayMs = RETRY_CONFIG.baseDelayMs, name = 'operation' } = options;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      return result;
    } catch (err) {
      lastError = err;
      console.log(`  ${name} attempt ${attempt}/${maxAttempts} failed: ${err.message}`);

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`  Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${name} failed after ${maxAttempts} attempts: ${lastError.message}`);
}

// Write failure report for downstream processing (GitHub issue creation)
async function writeFailureReport(outputDir, tool, version, reason, context) {
  const report = {
    timestamp: new Date().toISOString(),
    tool,
    version,
    reason,
    releaseData: context.release
      ? {
          id: context.release.id,
          tool: context.release.tool,
          version: context.release.version,
          date: context.release.date,
          summary: context.release.summary,
          url: context.release.url,
        }
      : null,
    fetchedContentLength: context.enrichedNotes?.length || 0,
    extractedFeatures: context.features || null,
    sourceUrl: context.release?.url || null,
    retryAttempts: context.retryAttempts || 0,
  };

  await fs.mkdir(outputDir, { recursive: true });
  const filename = `failure-${tool}-${version}-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);
  await fs.writeFile(filepath, JSON.stringify(report, null, 2));
  console.log(`\n📋 Failure report written: ${filepath}`);
  return filename;
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tool: null,
    version: null,
    count: 6,
    output: null,
    allFormats: false,
    generateImage: false,
    updateReleases: false,
    force: false,
    useStoredSource: false,
    allMissing: false,
    maxAgeDays: 7, // Default: only process releases from last 7 days
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--tool=')) {
      options.tool = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      options.version = arg.split('=')[1];
    } else if (arg.startsWith('--count=')) {
      options.count = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--all-formats') {
      options.allFormats = true;
    } else if (arg === '--generate-image') {
      options.generateImage = true;
    } else if (arg === '--update-releases') {
      options.updateReleases = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--use-stored-source') {
      options.useStoredSource = true;
    } else if (arg === '--all-missing') {
      options.allMissing = true;
    } else if (arg.startsWith('--max-age-days=')) {
      options.maxAgeDays = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node generate-infographic-prompt.mjs [options]

Options:
  --tool=<id>          Tool ID to generate prompt for (claude-code, kiro, openai-codex, gemini-cli, cursor, github-copilot, windsurf)
  --version=<ver>      Specific version to generate for (default: latest release)
  --count=<n>          Number of features to extract (default: 6)
  --output=<path>      Output directory for generated prompts (default: generated-prompts/)
  --all-formats        Generate prompts for all aspect ratios (1:1, 16:9, 9:16)
  --generate-image     Generate images using Nano Banana Pro (requires GOOGLE_API_KEY)
  --update-releases    Save images to public/images/infographics/ and update releases.json
  --force              Regenerate infographic even if one already exists
  --use-stored-source  Use source content from existing features.json instead of re-fetching
  --all-missing        Generate infographics for all recent releases missing them (ignores --tool/--version)
  --max-age-days=<n>   With --all-missing, only process releases from last N days (default: 7)
  --help, -h           Show this help message

Environment Variables:
  ANTHROPIC_API_KEY  Required for Claude feature extraction
  GOOGLE_API_KEY     Required for --generate-image (Nano Banana Pro)

Examples:
  node generate-infographic-prompt.mjs --tool=claude-code
  node generate-infographic-prompt.mjs --tool=gemini-cli --count=4 --all-formats
  node generate-infographic-prompt.mjs --tool=claude-code --generate-image --update-releases
  node generate-infographic-prompt.mjs --tool=cursor --version=2.3 --generate-image --update-releases --force
  node generate-infographic-prompt.mjs --all-missing --generate-image --update-releases
`);
      process.exit(0);
    }
  }

  return options;
}

// Load releases data
async function loadReleases() {
  const content = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(content);
}

// Get a release for a tool (latest or specific version)
function getRelease(releases, toolId, version = null) {
  if (version) {
    // Find specific version (try with and without 'v' prefix)
    return releases.find((r) =>
      r.tool === toolId &&
      (r.version === version || r.version === `v${version}` || r.version === version.replace(/^v/, ''))
    );
  }
  // Get latest release for tool
  return releases.find((r) => r.tool === toolId);
}

// Format date as "Month Day, Year"
function formatReleaseDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Fetch full release notes from URL using Claude
async function fetchReleaseNotes(client, url, version = null) {
  console.log(`Fetching release notes from: ${url}${version ? ` for version ${version}` : ''}`);

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }

  const html = await res.text();

  // Build version-specific prompt if version is provided
  const versionContext = version
    ? `I need the release notes specifically for version ${version}. Look for a section header like "## ${version}" or similar versioning format.`
    : '';

  // Use Claude to extract the release notes from the HTML
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Extract the release notes content from this HTML page. ${versionContext}

Return only the features, changes, and improvements mentioned. Be comprehensive but concise.

IMPORTANT:
- If the page is a changelog with multiple versions, extract ONLY the content for ${version ? `version ${version}` : 'the most recent version'}.
- If you cannot find release notes for the specified version, respond with: "VERSION_NOT_FOUND: Could not locate release notes for version ${version || 'specified'}"
- If this is a patch/bugfix release with minimal changes, list the specific fixes.

HTML:
${html.slice(0, 50000)}`,
      },
    ],
  });

  const notes = response.content[0].text;

  // Check if Claude couldn't find the version
  if (notes.includes('VERSION_NOT_FOUND')) {
    throw new Error(`Could not find release notes for version ${version} in the HTML content`);
  }

  console.log(`  Fetched ${notes.length} characters of release notes`);
  return notes;
}

// Extract compare URL from release notes (e.g., "v0.24.4...v0.24.5")
function extractCompareUrl(text) {
  // Match GitHub compare URLs like:
  // https://github.com/owner/repo/compare/v1.0.0...v1.0.1
  // or relative references like v1.0.0...v1.0.1
  const fullUrlMatch = text.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)\/compare\/([^\s)]+)/);
  if (fullUrlMatch) {
    return {
      owner: fullUrlMatch[1],
      repo: fullUrlMatch[2],
      range: fullUrlMatch[3],
    };
  }
  return null;
}

// Fetch content from GitHub compare URL (commits and PRs)
async function fetchCompareContent(owner, repo, range) {
  console.log(`Fetching commit data from GitHub compare: ${owner}/${repo}/compare/${range}`);

  // Use GitHub API to get compare data
  const compareUrl = `https://api.github.com/repos/${owner}/${repo}/compare/${range}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'havoptic-infographic-generator',
  };

  // Add auth token if available (for higher rate limits)
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const compareRes = await fetch(compareUrl, { headers });
  if (!compareRes.ok) {
    throw new Error(`GitHub API error: ${compareRes.status} ${compareRes.statusText}`);
  }

  const compareData = await compareRes.json();
  const commits = compareData.commits || [];

  if (commits.length === 0) {
    throw new Error('No commits found in compare range');
  }

  console.log(`  Found ${commits.length} commits in compare range`);

  // Extract commit messages and PR references
  const changes = [];
  const prNumbers = new Set();

  for (const commit of commits) {
    const message = commit.commit?.message || '';
    const firstLine = message.split('\n')[0];

    // Skip merge commits and release commits
    if (firstLine.startsWith('Merge ') || firstLine.includes('chore(release)')) {
      continue;
    }

    changes.push(firstLine);

    // Extract PR numbers from commit message (e.g., "(#17043)")
    const prMatches = message.match(/#(\d+)/g);
    if (prMatches) {
      prMatches.forEach((pr) => prNumbers.add(pr.replace('#', '')));
    }
  }

  // Fetch PR details for richer context (limit to first 5 PRs to avoid rate limits)
  const prDetails = [];
  const prsToFetch = Array.from(prNumbers).slice(0, 5);

  for (const prNum of prsToFetch) {
    try {
      const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNum}`;
      const prRes = await fetch(prUrl, { headers });

      if (prRes.ok) {
        const prData = await prRes.json();
        prDetails.push({
          number: prNum,
          title: prData.title,
          body: prData.body?.slice(0, 500) || '', // Limit body length
        });
        console.log(`  Fetched PR #${prNum}: ${prData.title}`);
      }
    } catch {
      // Ignore individual PR fetch failures
      console.log(`  Could not fetch PR #${prNum}`);
    }
  }

  // Build formatted content for feature extraction
  let content = `## Changes in this release\n\n`;

  if (prDetails.length > 0) {
    content += `### Pull Requests\n\n`;
    for (const pr of prDetails) {
      content += `**${pr.title}** (PR #${pr.number})\n`;
      if (pr.body) {
        // Extract summary section if present
        const summaryMatch = pr.body.match(/## Summary\s*([\s\S]*?)(?=##|$)/i);
        if (summaryMatch) {
          content += `${summaryMatch[1].trim()}\n`;
        } else {
          content += `${pr.body.slice(0, 200)}\n`;
        }
      }
      content += '\n';
    }
  }

  if (changes.length > 0) {
    content += `### Commits\n\n`;
    for (const change of changes) {
      content += `- ${change}\n`;
    }
  }

  console.log(`  Built ${content.length} chars of content from compare data`);
  return content;
}

// Extract features using Claude SDK
async function extractFeatures(client, release, count, enrichedNotes = null) {
  const formattedDate = formatReleaseDate(release.date);

  const systemPrompt = `You extract features from release notes. For each feature provide:
- icon (emoji from: ⚡🚀🧠🤖🔌🔗🔒🛠️💻📊👥🆕)
- name (2-4 words)
- description (5-8 words, benefit-focused)

Return JSON only: {"features": [{icon, name, description}], "releaseHighlight": "...", "releaseInfo": "v${release.version} • ${formattedDate}"}

IMPORTANT:
- Use the exact releaseInfo provided above. Do not change the version or date.
- Only extract features that are ACTUALLY mentioned in the release notes.
- NEVER invent or hallucinate features that aren't explicitly described.
- If there are fewer than ${count} features, return only what's available.`;

  const notesContent = enrichedNotes || release.summary;

  const userPrompt = `Extract the top ${count} features from this release:

Tool: ${release.toolDisplayName}
Version: ${release.version}
Release Date: ${formattedDate}

Release Notes:
${notesContent}

Focus on the most impactful user-facing features. Only include features explicitly mentioned in the release notes above.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const text = response.content[0].text;
  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

// Generate Nano Banana Pro prompt
function generateImagePrompt(toolId, features, format = '1:1') {
  const config = TOOL_CONFIGS[toolId];
  if (!config) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  const aspectRatios = {
    '1:1': 'square (1080x1080)',
    '16:9': 'landscape (1920x1080)',
    '9:16': 'portrait/story (1080x1920)',
  };

  const featureCount = features.features.length;

  // Single-feature releases get a focused layout (no empty grid boxes)
  if (featureCount === 1) {
    const feature = features.features[0];
    return `Create a professional ${aspectRatios[format]} social media infographic for a developer tool bug fix release.

Header: "${config.displayName}" with "${features.releaseInfo}" subtitle
Layout: Dark background with a single centered feature card (no grid, no empty boxes)
Feature Card: Large, prominent card in the center with:
  - Icon: ${feature.icon}
  - Title: "${feature.name}"
  - Description: "${feature.description}"
  - Additional context: "${features.releaseHighlight}"
Footer: "havoptic.com" with "Track AI Tool Releases" tagline
Style: ${config.style}, brand color ${config.primaryColor}, high contrast, readable text, professional tech aesthetic
Important: This is a focused bug fix release. Show ONLY ONE feature card, centered and prominent. Do NOT show empty placeholder boxes or a grid layout.`;
  }

  // Multi-feature releases use the grid layout
  const featureCards = features.features
    .map((f, i) => `${i + 1}. ${f.icon} "${f.name}" - "${f.description}"`)
    .join('\n');

  // Determine optimal grid layout based on feature count
  let gridLayout;
  if (featureCount <= 2) {
    gridLayout = '1x2 horizontal';
  } else if (featureCount <= 4) {
    gridLayout = '2x2';
  } else {
    gridLayout = format === '9:16' ? '2x3 vertical' : '2x3';
  }

  return `Create a professional ${aspectRatios[format]} social media infographic for a developer tool release.

Header: "${config.displayName}" with "${features.releaseInfo}" subtitle
Layout: Dark background, ${featureCount} feature cards in ${gridLayout} grid with subtle glow effects
Feature Cards:
${featureCards}
Footer: "havoptic.com" with "Track AI Tool Releases" tagline
Style: ${config.style}, brand color ${config.primaryColor}, high contrast, readable text, professional tech aesthetic
Highlight: "${features.releaseHighlight}"
Important: Show EXACTLY ${featureCount} feature cards. Do NOT add empty placeholder boxes.`;
}

// Save infographic to public folder and update release data object (does not write to disk)
async function saveInfographicToPublic(imagePath, releaseId, data, format = '1:1') {
  // Ensure public images directory exists
  await fs.mkdir(PUBLIC_IMAGES_DIR, { recursive: true });

  // Copy image to public folder with a clean name
  const filename = path.basename(imagePath);
  const publicPath = path.join(PUBLIC_IMAGES_DIR, filename);
  await fs.copyFile(imagePath, publicPath);
  console.log(`Copied to public: ${publicPath}`);

  // Update the release in data object with the infographicUrl
  const infographicUrl = `/images/infographics/${filename}`;
  const releaseIndex = data.releases.findIndex((r) => r.id === releaseId);

  if (releaseIndex !== -1) {
    // Use different field for 16:9 format (used for OG images)
    if (format === '16:9') {
      data.releases[releaseIndex].infographicUrl16x9 = infographicUrl;
      console.log(`Set infographicUrl16x9: ${infographicUrl}`);
    } else {
      data.releases[releaseIndex].infographicUrl = infographicUrl;
      console.log(`Set infographicUrl: ${infographicUrl}`);
    }
  }

  return infographicUrl;
}

// Write releases data to disk
async function saveReleasesData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
  console.log('Updated releases.json');
}

// Generate image using Nano Banana Pro (Gemini)
async function generateImage(prompt, outputPath, format = '1:1') {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is required for image generation');
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log('Generating image with Nano Banana Pro...');

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: format,
        imageSize: '2K',
      },
    },
  });

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts || [];
  let imageData = null;

  for (const part of parts) {
    if (part.inlineData) {
      imageData = part.inlineData;
      break;
    }
  }

  if (!imageData) {
    throw new Error('No image data returned from Gemini API');
  }

  // Decode base64 and save
  const buffer = Buffer.from(imageData.data, 'base64');
  const extension = imageData.mimeType?.includes('png') ? 'png' : 'jpg';
  const finalPath = outputPath.replace(/\.[^.]+$/, `.${extension}`);

  await fs.writeFile(finalPath, buffer);
  console.log(`Generated image: ${finalPath}`);

  return finalPath;
}

// Generate infographic for a single release
// Returns { success: true } or { success: false, error: string }
async function generateForRelease(release, data, client, options, outputDir) {
  const MIN_CONTENT_LENGTH = 100;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${release.tool} ${release.version}`);
  console.log(`${'='.repeat(60)}`);

  // Skip if release already has an infographic (unless forcing regeneration)
  if (release.infographicUrl && options.generateImage && options.updateReleases && !options.force) {
    console.log(`Skipping - infographic already exists: ${release.infographicUrl}`);
    return { success: true, skipped: true };
  }

  // Verify tool config exists
  if (!TOOL_CONFIGS[release.tool]) {
    console.error(`Unknown tool: ${release.tool}`);
    return { success: false, error: `Unknown tool: ${release.tool}` };
  }

  console.log(`Date: ${release.date}`);
  console.log(`Summary: ${release.summary}\n`);

  // Use fullNotes if available, otherwise fall back to summary
  const storedNotes = release.fullNotes || release.summary;

  // Try to load existing features.json if --use-stored-source is set
  let existingFeatures = null;
  if (options.useStoredSource) {
    const files = await fs.readdir(outputDir).catch(() => []);
    const featuresFile = files.find(
      (f) => f.startsWith(`${release.tool}-${release.version}`) && f.endsWith('-features.json')
    );
    if (featuresFile) {
      try {
        const content = await fs.readFile(path.join(outputDir, featuresFile), 'utf-8');
        existingFeatures = JSON.parse(content);
        console.log(`Found existing features.json: ${featuresFile}`);
      } catch (err) {
        console.log(`Failed to load existing features.json: ${err.message}`);
      }
    }
  }

  // Fetch enriched release notes if content is sparse
  let enrichedNotes = null;
  let sourceOrigin = 'fullNotes';
  let fetchRetryAttempts = 0;

  if (options.useStoredSource && existingFeatures?.sourceContent) {
    console.log(`Using stored source content (${existingFeatures.sourceContent.length} chars)`);
    enrichedNotes = existingFeatures.sourceContent;
    sourceOrigin = 'stored';
  } else if (storedNotes.length < MIN_CONTENT_LENGTH && release.url) {
    console.log(`Content is sparse (${storedNotes.length} chars), fetching full release notes...`);

    try {
      enrichedNotes = await withRetry(
        async (attempt) => {
          fetchRetryAttempts = attempt;
          return fetchReleaseNotes(client, release.url, release.version);
        },
        { name: 'fetchReleaseNotes', maxAttempts: RETRY_CONFIG.maxAttempts }
      );
      sourceOrigin = 'fetched';
    } catch (err) {
      console.warn(`\n⚠️  WARNING: Failed to fetch release notes after ${fetchRetryAttempts} attempts: ${err.message}`);
      enrichedNotes = storedNotes;
      sourceOrigin = 'fullNotes';
    }

    // Try GitHub compare API fallback
    if (!enrichedNotes || enrichedNotes.length < MIN_CONTENT_LENGTH) {
      console.log(`\n📊 Content still sparse, trying GitHub compare API fallback...`);
      const compareInfo = extractCompareUrl(storedNotes) || extractCompareUrl(release.summary || '');

      if (compareInfo) {
        try {
          const compareContent = await withRetry(
            async () => fetchCompareContent(compareInfo.owner, compareInfo.repo, compareInfo.range),
            { name: 'fetchCompareContent', maxAttempts: 2 }
          );

          if (compareContent && compareContent.length >= MIN_CONTENT_LENGTH) {
            console.log(`✅ Successfully fetched content from GitHub compare API`);
            enrichedNotes = compareContent;
            sourceOrigin = 'compare';
          }
        } catch (compareErr) {
          console.warn(`   Compare API fallback failed: ${compareErr.message}`);
        }
      } else {
        console.log(`   No compare URL found in release notes`);
      }
    }

    if (!enrichedNotes || enrichedNotes.length < MIN_CONTENT_LENGTH) {
      console.warn(`\n⚠️  WARNING: Release has minimal content (${enrichedNotes?.length || 0} chars).`);
      console.warn('   Generated infographic may not be accurate.\n');
    }
  } else if (storedNotes.length >= MIN_CONTENT_LENGTH) {
    console.log(`Using stored notes (${storedNotes.length} chars)`);
    enrichedNotes = storedNotes;
    sourceOrigin = 'fullNotes';
  }

  // Extract features with retry and validation
  console.log('Extracting features with Claude...');
  let features = null;
  let extractionRetryAttempts = 0;

  try {
    features = await withRetry(
      async (attempt) => {
        extractionRetryAttempts = attempt;
        const extracted = await extractFeatures(client, release, options.count, enrichedNotes);

        const validationResult = validateFeatures(extracted);
        if (!validationResult.valid) {
          throw new Error(`Validation failed: ${validationResult.reason}`);
        }

        return extracted;
      },
      { name: 'extractFeatures', maxAttempts: RETRY_CONFIG.maxAttempts }
    );
  } catch (err) {
    console.error(`\n❌ FATAL: Feature extraction failed after ${extractionRetryAttempts} attempts`);
    console.error(`   Error: ${err.message}\n`);

    await writeFailureReport(outputDir, release.tool, release.version, err.message, {
      release,
      enrichedNotes,
      features,
      retryAttempts: extractionRetryAttempts,
    });

    return { success: false, error: err.message };
  }

  console.log(`Extracted ${features.features.length} features\n`);

  // Generate prompts
  const formats = options.allFormats
    ? ['1:1', '16:9', '9:16']
    : options.updateReleases
      ? ['1:1', '16:9']
      : ['1:1'];
  const prompts = {};

  for (const format of formats) {
    prompts[format] = generateImagePrompt(release.tool, features, format);
  }

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = `${release.tool}-${release.version}-${timestamp}`;

  for (const [format, prompt] of Object.entries(prompts)) {
    const formatSuffix = format.replace(':', 'x');
    const filename = `${baseFilename}-${formatSuffix}.txt`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, prompt);
    console.log(`Written: ${filepath}`);

    if (options.generateImage) {
      const imagePath = path.join(outputDir, `${baseFilename}-${formatSuffix}.png`);
      try {
        const generatedPath = await generateImage(prompt, imagePath, format);

        if (options.updateReleases && (format === '1:1' || format === '16:9')) {
          await saveInfographicToPublic(generatedPath, release.id, data, format);
        }
      } catch (err) {
        console.error(`Failed to generate image for ${format}:`, err.message);
        return { success: false, error: `Image generation failed: ${err.message}` };
      }
    }
  }

  // Save features JSON with metadata
  const featuresFilename = `${baseFilename}-features.json`;
  const featuresPath = path.join(outputDir, featuresFilename);
  const featuresWithMetadata = {
    ...features,
    sourceContent: enrichedNotes,
    sourceUrl: release.url,
    sourceOrigin: sourceOrigin,
    extractedAt: new Date().toISOString(),
  };
  await fs.writeFile(featuresPath, JSON.stringify(featuresWithMetadata, null, 2));
  console.log(`Written: ${featuresPath}`);

  return { success: true };
}

// Main function
async function main() {
  const options = parseArgs();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  // Load releases data
  const data = await loadReleases();
  const outputDir = options.output || DEFAULT_OUTPUT_DIR;

  // Initialize Anthropic client
  const client = new Anthropic();

  // Handle --all-missing mode: generate for all recent releases without infographics
  if (options.allMissing) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.maxAgeDays);

    console.log(`\n🔍 Finding releases missing infographics (last ${options.maxAgeDays} days)...\n`);

    const missingReleases = data.releases.filter((r) => {
      if (r.infographicUrl) return false;
      if (!TOOL_CONFIGS[r.tool]) return false;
      const releaseDate = new Date(r.date);
      return releaseDate >= cutoffDate;
    });

    if (missingReleases.length === 0) {
      console.log('✅ All releases have infographics!');
      process.exit(0);
    }

    console.log(`Found ${missingReleases.length} releases missing infographics:`);
    for (const r of missingReleases) {
      console.log(`  - ${r.tool} ${r.version} (${r.date})`);
    }

    const results = { success: [], failed: [], skipped: [] };

    for (const release of missingReleases) {
      const result = await generateForRelease(release, data, client, options, outputDir);

      if (result.skipped) {
        results.skipped.push({ tool: release.tool, version: release.version });
      } else if (result.success) {
        results.success.push({ tool: release.tool, version: release.version });
      } else {
        results.failed.push({ tool: release.tool, version: release.version, error: result.error });
      }
    }

    // Save releases.json once at the end (if any were generated)
    if (options.updateReleases && options.generateImage && results.success.length > 0) {
      await saveReleasesData(data);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${results.success.length}`);
    for (const r of results.success) {
      console.log(`   - ${r.tool} v${r.version}`);
    }
    if (results.skipped.length > 0) {
      console.log(`⏭️  Skipped: ${results.skipped.length}`);
    }
    if (results.failed.length > 0) {
      console.log(`❌ Failed: ${results.failed.length}`);
      for (const r of results.failed) {
        console.log(`   - ${r.tool} v${r.version}: ${r.error}`);
      }
    }

    // Exit with error if any failed
    if (results.failed.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  }

  // Single release mode (original behavior)
  if (!options.tool) {
    console.error('Error: --tool argument is required (or use --all-missing)');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (!TOOL_CONFIGS[options.tool]) {
    console.error(`Error: Unknown tool "${options.tool}"`);
    console.error('Available tools:', Object.keys(TOOL_CONFIGS).join(', '));
    process.exit(1);
  }

  const release = getRelease(data.releases, options.tool, options.version);

  if (!release) {
    const versionMsg = options.version ? ` version ${options.version}` : '';
    console.error(`Error: No releases found for tool "${options.tool}"${versionMsg}`);
    process.exit(1);
  }

  const result = await generateForRelease(release, data, client, options, outputDir);

  // Save releases.json
  if (options.updateReleases && options.generateImage && result.success && !result.skipped) {
    await saveReleasesData(data);
  }

  if (!result.success) {
    process.exit(1);
  }

  // Print prompt for single release mode (original behavior)
  if (!options.generateImage) {
    const formats = options.allFormats ? ['1:1', '16:9', '9:16'] : ['1:1'];
    for (const format of formats) {
      const prompt = generateImagePrompt(options.tool, {
        features: [],
        releaseInfo: `v${release.version}`,
        releaseHighlight: '',
      }, format);
      console.log(`\n--- Generated Prompt (${format}) ---\n`);
      console.log(prompt);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const PUBLIC_IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'infographics');
const RESULT_FILE = 'remediation-result.json';

// Cost control limits
const MAX_API_CALLS = 3;
const MAX_TOKENS_PER_CALL = 4000;

// Nano Banana Pro for image generation
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

// Tool configurations (same as generate-infographic-prompt.mjs)
const TOOL_CONFIGS = {
  'claude-code': {
    displayName: 'CLAUDE CODE',
    primaryColor: '#8B5CF6',
    style: 'Purple/coral gradient, dark background with subtle grid pattern, modern tech aesthetic',
    alternativeUrls: [
      'https://www.npmjs.com/package/@anthropic-ai/claude-code?activeTab=versions',
      'https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md',
    ],
  },
  kiro: {
    displayName: 'KIRO',
    primaryColor: '#8B5CF6',
    style: 'Purple accent, dark gradient background, cloud-native professional aesthetic',
    alternativeUrls: ['https://kiro.dev/changelog'],
  },
  'openai-codex': {
    displayName: 'CODEX CLI',
    primaryColor: '#059669',
    style: 'Emerald green accent, black background, minimalist terminal aesthetic',
    alternativeUrls: [],
  },
  'gemini-cli': {
    displayName: 'GEMINI CLI',
    primaryColor: '#00ACC1',
    style: 'Teal/cyan accent, dark background, clean Material Design',
    alternativeUrls: [],
  },
  cursor: {
    displayName: 'CURSOR',
    primaryColor: '#7c3aed',
    style: 'Purple glassmorphism, dark gradient background, IDE-inspired modern aesthetic',
    alternativeUrls: ['https://www.cursor.com/changelog'],
  },
  aider: {
    displayName: 'AIDER',
    primaryColor: '#22c55e',
    style: 'Terminal green on dark background, retro-modern hacker aesthetic',
    alternativeUrls: ['https://aider.chat/HISTORY.html'],
  },
};

// Track API calls for cost control
let apiCallCount = 0;

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tool: null,
    version: null,
    issue: null,
    attempt: 1,
  };

  for (const arg of args) {
    if (arg.startsWith('--tool=')) {
      options.tool = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      options.version = arg.split('=')[1];
    } else if (arg.startsWith('--issue=')) {
      options.issue = arg.split('=')[1];
    } else if (arg.startsWith('--attempt=')) {
      options.attempt = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

// Load releases data
async function loadReleases() {
  const content = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(content);
}

// Get a specific release
function getRelease(releases, toolId, version) {
  return releases.find(
    (r) =>
      r.tool === toolId &&
      (r.version === version || r.version === `v${version}` || r.version === version.replace(/^v/, ''))
  );
}

// Call Claude API with cost limits
async function callClaude(client, prompt, systemPrompt = null) {
  if (apiCallCount >= MAX_API_CALLS) {
    throw new Error(`API call limit reached (${MAX_API_CALLS})`);
  }
  apiCallCount++;

  const options = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: MAX_TOKENS_PER_CALL,
    messages: [{ role: 'user', content: prompt }],
  };

  if (systemPrompt) {
    options.system = systemPrompt;
  }

  const response = await client.messages.create(options);
  return response.content[0].text;
}

// Fetch content from URL
async function fetchUrl(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.text();
}

// Strategy 1: Try to get content from the CHANGELOG directly (for markdown files)
async function tryChangelogDirect(client, tool, version) {
  console.log('\n📋 Strategy 1: Direct CHANGELOG parsing');

  if (tool !== 'claude-code') {
    return { success: false, reason: 'Only applicable for claude-code' };
  }

  try {
    const rawUrl = 'https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md';
    const markdown = await fetchUrl(rawUrl);

    // Parse the changelog to find the specific version section
    const versionPattern = new RegExp(`^## ${version.replace(/\./g, '\\.')}\\s*\\n([\\s\\S]*?)(?=^## \\d|$)`, 'm');
    const match = markdown.match(versionPattern);

    if (match && match[1]) {
      const content = match[1].trim();
      console.log(`  Found version ${version} section: ${content.length} chars`);

      if (content.length < 30) {
        return { success: false, reason: `Version section too short (${content.length} chars)` };
      }

      return { success: true, content, source: 'changelog-direct' };
    }

    return { success: false, reason: `Version ${version} not found in CHANGELOG` };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// Strategy 2: Try alternative URLs for the tool
async function tryAlternativeUrls(client, tool, version) {
  console.log('\n🔗 Strategy 2: Alternative URLs');

  const config = TOOL_CONFIGS[tool];
  if (!config?.alternativeUrls?.length) {
    return { success: false, reason: 'No alternative URLs configured' };
  }

  for (const url of config.alternativeUrls) {
    try {
      const html = await fetchUrl(url);

      // Use Claude to extract version-specific content
      const prompt = `Extract the release notes for version ${version} from this content.

IMPORTANT:
- Find the section specifically for version ${version}
- Return ONLY the changes for this version, not other versions
- If you cannot find this specific version, respond with: "VERSION_NOT_FOUND"
- Be comprehensive - include all features, fixes, and improvements

Content (first 40000 chars):
${html.slice(0, 40000)}`;

      const content = await callClaude(client, prompt);

      if (content.includes('VERSION_NOT_FOUND')) {
        console.log(`  Version not found in ${url}`);
        continue;
      }

      if (content.length > 50) {
        console.log(`  Found content from ${url}: ${content.length} chars`);
        return { success: true, content, source: url };
      }
    } catch (err) {
      console.log(`  Failed to fetch ${url}: ${err.message}`);
    }
  }

  return { success: false, reason: 'No content found in alternative URLs' };
}

// Strategy 3: Use Claude to analyze and suggest what the infographic should show
async function tryContentAnalysis(client, release) {
  console.log('\n🧠 Strategy 3: Content analysis and inference');

  const existingContent = release.fullNotes || release.summary || '';
  if (existingContent.length < 10) {
    return { success: false, reason: 'No existing content to analyze' };
  }

  const prompt = `Analyze this release note and extract meaningful features for an infographic.

Release: ${release.toolDisplayName} ${release.version}
Content: "${existingContent}"

Even if this is a small bugfix release, extract what information IS available.

Return JSON with this structure:
{
  "features": [
    {"icon": "emoji", "name": "2-4 words", "description": "5-8 words"}
  ],
  "releaseHighlight": "one sentence summary",
  "releaseInfo": "v${release.version} • ${formatDate(release.date)}",
  "confidence": "high|medium|low"
}

RULES:
- Only extract what's actually mentioned
- For bugfix releases, the feature can be the fix itself
- Use appropriate icons: 🔧 for fixes, ⚡ for improvements, 🆕 for new features
- Minimum 1 feature, even if it's just "Bug Fix" with the fix description`;

  try {
    const response = await callClaude(client, prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.features?.length > 0 && parsed.confidence !== 'low') {
        console.log(`  Extracted ${parsed.features.length} features with ${parsed.confidence} confidence`);
        return { success: true, features: parsed, source: 'analysis' };
      }
    }

    return { success: false, reason: 'Could not extract meaningful features' };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Extract features from content using Claude
async function extractFeatures(client, release, content) {
  const formattedDate = formatDate(release.date);

  const prompt = `Extract features from these release notes for an infographic.

Tool: ${release.toolDisplayName}
Version: ${release.version}
Date: ${formattedDate}

Release Notes:
${content}

Return JSON:
{
  "features": [{"icon": "emoji", "name": "2-4 words", "description": "5-8 words"}],
  "releaseHighlight": "summary",
  "releaseInfo": "v${release.version} • ${formattedDate}"
}

Use icons: ⚡🚀🧠🤖🔌🔗🔒🛠️💻📊👥🆕🔧`;

  const response = await callClaude(client, prompt);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response');
  }

  return JSON.parse(jsonMatch[0]);
}

// Generate infographic image
async function generateInfographic(features, tool, release) {
  const config = TOOL_CONFIGS[tool];
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not available');
  }

  const ai = new GoogleGenAI({ apiKey });

  const featureCards = features.features.map((f, i) => `${i + 1}. ${f.icon} "${f.name}" - "${f.description}"`).join('\n');

  const prompt = `Create a professional square (1080x1080) social media infographic for a developer tool release.

Header: "${config.displayName}" with "${features.releaseInfo}" subtitle
Layout: Dark background, ${features.features.length} feature cards in 2x3 grid with subtle glow effects
Feature Cards:
${featureCards}
Footer: "havoptic.com" with "Track AI Tool Releases" tagline
Style: ${config.style}, brand color ${config.primaryColor}, high contrast, readable text, professional tech aesthetic
Highlight: "${features.releaseHighlight}"`;

  console.log('\n🎨 Generating infographic...');

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '2K',
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      const extension = part.inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${tool}-${release.version}-${timestamp}-1x1.${extension}`;
      const filepath = path.join(PUBLIC_IMAGES_DIR, filename);

      await fs.mkdir(PUBLIC_IMAGES_DIR, { recursive: true });
      await fs.writeFile(filepath, buffer);

      return { filename, filepath, url: `/images/infographics/${filename}` };
    }
  }

  throw new Error('No image data in response');
}

// Write result file
async function writeResult(status, analysis, actions, features = null) {
  const result = {
    status,
    analysis,
    actions,
    features,
    apiCallsUsed: apiCallCount,
    timestamp: new Date().toISOString(),
  };

  await fs.writeFile(RESULT_FILE, JSON.stringify(result, null, 2));
  console.log(`\n📝 Result written to ${RESULT_FILE}`);
  return result;
}

// Main remediation logic
async function main() {
  const options = parseArgs();

  if (!options.tool || !options.version) {
    console.error('Error: --tool and --version are required');
    await writeResult('error', 'Missing required arguments', 'None');
    process.exit(1);
  }

  console.log(`\n🔧 Remediating infographic for ${options.tool} ${options.version}`);
  console.log(`   Issue: #${options.issue}, Attempt: ${options.attempt}`);
  console.log(`   API call limit: ${MAX_API_CALLS}`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await writeResult('error', 'ANTHROPIC_API_KEY not available', 'None');
    process.exit(1);
  }

  const client = new Anthropic();

  // Load release data
  const data = await loadReleases();
  const release = getRelease(data.releases, options.tool, options.version);

  if (!release) {
    await writeResult('error', `Release not found: ${options.tool} ${options.version}`, 'None');
    process.exit(1);
  }

  console.log(`\n📦 Found release: ${release.id}`);
  console.log(`   Current summary: ${release.summary?.slice(0, 100)}...`);

  // Try remediation strategies in order
  const strategies = [];
  let content = null;
  let features = null;

  // Strategy 1: Direct CHANGELOG parsing
  const strategy1 = await tryChangelogDirect(client, options.tool, options.version);
  strategies.push(`1. Direct CHANGELOG: ${strategy1.success ? '✅' : '❌'} ${strategy1.reason || ''}`);

  if (strategy1.success) {
    content = strategy1.content;
  }

  // Strategy 2: Alternative URLs (only if strategy 1 failed and we have API calls left)
  if (!content && apiCallCount < MAX_API_CALLS) {
    const strategy2 = await tryAlternativeUrls(client, options.tool, options.version);
    strategies.push(`2. Alternative URLs: ${strategy2.success ? '✅' : '❌'} ${strategy2.reason || ''}`);

    if (strategy2.success) {
      content = strategy2.content;
    }
  }

  // Strategy 3: Content analysis (if we still have no content)
  if (!content && apiCallCount < MAX_API_CALLS) {
    const strategy3 = await tryContentAnalysis(client, release);
    strategies.push(`3. Content analysis: ${strategy3.success ? '✅' : '❌'} ${strategy3.reason || ''}`);

    if (strategy3.success) {
      features = strategy3.features;
    }
  }

  // If we found content but no features yet, extract them
  if (content && !features && apiCallCount < MAX_API_CALLS) {
    try {
      features = await extractFeatures(client, release, content);
      strategies.push(`4. Feature extraction: ✅ Extracted ${features.features?.length || 0} features`);
    } catch (err) {
      strategies.push(`4. Feature extraction: ❌ ${err.message}`);
    }
  }

  // Generate infographic if we have features
  if (features?.features?.length > 0) {
    try {
      const image = await generateInfographic(features, options.tool, release);

      // Update releases.json
      const releaseIndex = data.releases.findIndex((r) => r.id === release.id);
      if (releaseIndex !== -1) {
        data.releases[releaseIndex].infographicUrl = image.url;
        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
      }

      strategies.push(`5. Image generation: ✅ ${image.filename}`);

      await writeResult(
        'fixed',
        `Successfully remediated infographic for ${options.tool} ${options.version}`,
        strategies.join('\n'),
        features
      );

      console.log('\n✅ Remediation successful!');
      return;
    } catch (err) {
      strategies.push(`5. Image generation: ❌ ${err.message}`);
    }
  }

  // If we get here, remediation failed
  const analysis = `Could not remediate infographic for ${options.tool} ${options.version}.

Possible reasons:
- The release has very minimal content (single-line bugfix)
- The version was not found in any source
- API call limit reached before finding usable content

This release may not warrant an infographic if it's just a minor patch.`;

  await writeResult('failed', analysis, strategies.join('\n'));

  console.log('\n❌ Remediation failed');
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await writeResult('error', err.message, 'Script crashed');
  process.exit(1);
});

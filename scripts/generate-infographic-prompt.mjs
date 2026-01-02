import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'generated-prompts');
const PUBLIC_IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'infographics');

// Gemini 3 Pro Image model (Nano Banana Pro)
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
  'aider': {
    displayName: 'AIDER',
    primaryColor: '#22c55e',
    style: 'Terminal green on dark background, retro-modern hacker aesthetic',
  },
};

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
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node generate-infographic-prompt.mjs [options]

Options:
  --tool=<id>          Tool ID to generate prompt for (claude-code, kiro, openai-codex, gemini-cli, cursor, aider)
  --version=<ver>      Specific version to generate for (default: latest release)
  --count=<n>          Number of features to extract (default: 6)
  --output=<path>      Output directory for generated prompts (default: generated-prompts/)
  --all-formats        Generate prompts for all aspect ratios (1:1, 16:9, 9:16)
  --generate-image     Generate images using Nano Banana Pro (requires GOOGLE_API_KEY)
  --update-releases    Save images to public/images/infographics/ and update releases.json
  --force              Regenerate infographic even if one already exists
  --help, -h           Show this help message

Environment Variables:
  ANTHROPIC_API_KEY  Required for Claude feature extraction
  GOOGLE_API_KEY     Required for --generate-image (Nano Banana Pro)

Examples:
  node generate-infographic-prompt.mjs --tool=claude-code
  node generate-infographic-prompt.mjs --tool=gemini-cli --count=4 --all-formats
  node generate-infographic-prompt.mjs --tool=claude-code --generate-image --update-releases
  node generate-infographic-prompt.mjs --tool=cursor --version=2.3 --generate-image --update-releases --force
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
async function fetchReleaseNotes(client, url) {
  console.log(`Fetching release notes from: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      console.log(`  Failed to fetch URL: ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Use Claude to extract the release notes from the HTML
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Extract the release notes content from this HTML page. Return only the features, changes, and improvements mentioned. Be comprehensive but concise. If this is a patch/bugfix release with minimal changes, say so clearly.\n\nHTML:\n${html.slice(0, 50000)}`,
        },
      ],
    });

    const notes = response.content[0].text;
    console.log(`  Fetched ${notes.length} characters of release notes`);
    return notes;
  } catch (err) {
    console.log(`  Error fetching release notes: ${err.message}`);
    return null;
  }
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

  const featureCards = features.features
    .map((f, i) => `${i + 1}. ${f.icon} "${f.name}" - "${f.description}"`)
    .join('\n');

  return `Create a professional ${aspectRatios[format]} social media infographic for a developer tool release.

Header: "${config.displayName}" with "${features.releaseInfo}" subtitle
Layout: Dark background, ${features.features.length} feature cards in ${format === '9:16' ? '2x3 vertical' : '2x3'} grid with subtle glow effects
Feature Cards:
${featureCards}
Footer: "havoptic.com" with "Track AI Tool Releases" tagline
Style: ${config.style}, brand color ${config.primaryColor}, high contrast, readable text, professional tech aesthetic
Highlight: "${features.releaseHighlight}"`;
}

// Save infographic to public folder and update releases.json
async function saveInfographicAndUpdateReleases(imagePath, releaseId, data) {
  // Ensure public images directory exists
  await fs.mkdir(PUBLIC_IMAGES_DIR, { recursive: true });

  // Copy image to public folder with a clean name
  const filename = path.basename(imagePath);
  const publicPath = path.join(PUBLIC_IMAGES_DIR, filename);
  await fs.copyFile(imagePath, publicPath);
  console.log(`Copied to public: ${publicPath}`);

  // Update the release in releases.json with the infographicUrl
  const infographicUrl = `/images/infographics/${filename}`;
  const releaseIndex = data.releases.findIndex((r) => r.id === releaseId);

  if (releaseIndex !== -1) {
    data.releases[releaseIndex].infographicUrl = infographicUrl;
    await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`Updated releases.json with infographicUrl: ${infographicUrl}`);
  }

  return infographicUrl;
}

// Generate image using Nano Banana Pro (Gemini)
async function generateImage(prompt, outputPath) {
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

// Main function
async function main() {
  const options = parseArgs();

  if (!options.tool) {
    console.error('Error: --tool argument is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (!TOOL_CONFIGS[options.tool]) {
    console.error(`Error: Unknown tool "${options.tool}"`);
    console.error('Available tools:', Object.keys(TOOL_CONFIGS).join(', '));
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log(`\nGenerating infographic prompt for ${options.tool}...\n`);

  // Load releases
  const data = await loadReleases();
  const release = getRelease(data.releases, options.tool, options.version);

  if (!release) {
    const versionMsg = options.version ? ` version ${options.version}` : '';
    console.error(`Error: No releases found for tool "${options.tool}"${versionMsg}`);
    process.exit(1);
  }

  // Skip if release already has an infographic (unless forcing regeneration)
  if (release.infographicUrl && options.generateImage && options.updateReleases && !options.force) {
    console.log(`Skipping ${options.tool} v${release.version} - infographic already exists: ${release.infographicUrl}`);
    process.exit(0);
  }

  console.log(`Latest release: ${release.version} (${release.date})`);
  console.log(`Summary: ${release.summary}\n`);

  // Initialize Anthropic client
  const client = new Anthropic();

  // Use fullNotes if available, otherwise fall back to summary
  const storedNotes = release.fullNotes || release.summary;
  const MIN_CONTENT_LENGTH = 100; // Minimum characters for reliable feature extraction

  // Fetch enriched release notes if content is sparse
  let enrichedNotes = null;
  if (storedNotes.length < MIN_CONTENT_LENGTH && release.url) {
    console.log(`Content is sparse (${storedNotes.length} chars), fetching full release notes...`);
    enrichedNotes = await fetchReleaseNotes(client, release.url);

    // If still sparse after fetching, warn user
    if (!enrichedNotes || enrichedNotes.length < MIN_CONTENT_LENGTH) {
      console.warn(`\n⚠️  WARNING: Release has minimal content (${enrichedNotes?.length || 0} chars).`);
      console.warn('   Generated infographic may not be accurate.');
      console.warn('   Consider using --force only for feature-rich releases.\n');
    }
  } else if (storedNotes.length >= MIN_CONTENT_LENGTH) {
    console.log(`Using stored notes (${storedNotes.length} chars)`);
    enrichedNotes = storedNotes;
  }

  // Extract features
  console.log('Extracting features with Claude...');
  const features = await extractFeatures(client, release, options.count, enrichedNotes);
  console.log(`Extracted ${features.features.length} features\n`);

  // Generate prompts
  const formats = options.allFormats ? ['1:1', '16:9', '9:16'] : ['1:1'];
  const prompts = {};

  for (const format of formats) {
    prompts[format] = generateImagePrompt(options.tool, features, format);
  }

  // Output
  const outputDir = options.output || DEFAULT_OUTPUT_DIR;
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = `${options.tool}-${release.version}-${timestamp}`;

  for (const [format, prompt] of Object.entries(prompts)) {
    const formatSuffix = format.replace(':', 'x');
    const filename = `${baseFilename}-${formatSuffix}.txt`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, prompt);
    console.log(`Written: ${filepath}`);

    // Generate image if requested
    if (options.generateImage) {
      const imagePath = path.join(outputDir, `${baseFilename}-${formatSuffix}.png`);
      try {
        const generatedPath = await generateImage(prompt, imagePath);

        // If --update-releases is set and this is the 1:1 format, save to public and update releases.json
        if (options.updateReleases && format === '1:1') {
          await saveInfographicAndUpdateReleases(generatedPath, release.id, data);
        }
      } catch (err) {
        console.error(`Failed to generate image for ${format}:`, err.message);
      }
    }
  }

  // Also output features JSON
  const featuresFilename = `${baseFilename}-features.json`;
  const featuresPath = path.join(outputDir, featuresFilename);
  await fs.writeFile(featuresPath, JSON.stringify(features, null, 2));
  console.log(`Written: ${featuresPath}`);

  console.log('\n--- Generated Prompt (1:1) ---\n');
  console.log(prompts['1:1']);
  console.log('\n--- Features ---\n');
  console.log(JSON.stringify(features, null, 2));

  if (options.generateImage) {
    console.log('\n--- Images Generated ---');
    console.log('Check the output directory for generated infographic images.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

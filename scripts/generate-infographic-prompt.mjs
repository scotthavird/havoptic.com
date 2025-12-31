import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'generated-prompts');

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
    primaryColor: '#FF9900',
    style: 'AWS orange accent, navy blue background, cloud-native professional aesthetic',
  },
  'openai-codex': {
    displayName: 'CODEX CLI',
    primaryColor: '#10a37f',
    style: 'OpenAI green accent, black background, minimalist terminal aesthetic',
  },
  'gemini-cli': {
    displayName: 'GEMINI CLI',
    primaryColor: '#4285f4',
    style: 'Google blue/red/yellow/green accents, white background, clean Material Design',
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
    count: 6,
    output: null,
    allFormats: false,
    generateImage: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--tool=')) {
      options.tool = arg.split('=')[1];
    } else if (arg.startsWith('--count=')) {
      options.count = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--all-formats') {
      options.allFormats = true;
    } else if (arg === '--generate-image') {
      options.generateImage = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node generate-infographic-prompt.mjs [options]

Options:
  --tool=<id>        Tool ID to generate prompt for (claude-code, kiro, openai-codex, gemini-cli, cursor, aider)
  --count=<n>        Number of features to extract (default: 6)
  --output=<path>    Output directory for generated prompts (default: generated-prompts/)
  --all-formats      Generate prompts for all aspect ratios (1:1, 16:9, 9:16)
  --generate-image   Generate images using Nano Banana Pro (requires GOOGLE_API_KEY)
  --help, -h         Show this help message

Environment Variables:
  ANTHROPIC_API_KEY  Required for Claude feature extraction
  GOOGLE_API_KEY     Required for --generate-image (Nano Banana Pro)

Examples:
  node generate-infographic-prompt.mjs --tool=claude-code
  node generate-infographic-prompt.mjs --tool=gemini-cli --count=4 --all-formats
  node generate-infographic-prompt.mjs --tool=claude-code --generate-image
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

// Get the latest release for a tool
function getLatestRelease(releases, toolId) {
  return releases.find((r) => r.tool === toolId);
}

// Format date as "Month Year"
function formatReleaseDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Extract features using Claude SDK
async function extractFeatures(client, release, count) {
  const formattedDate = formatReleaseDate(release.date);

  const systemPrompt = `You extract features from release notes. For each feature provide:
- icon (emoji from: ⚡🚀🧠🤖🔌🔗🔒🛠️💻📊👥🆕)
- name (2-4 words)
- description (5-8 words, benefit-focused)

Return JSON only: {"features": [{icon, name, description}], "releaseHighlight": "...", "releaseDate": "${formattedDate}"}

IMPORTANT: Use the exact releaseDate provided above. Do not change the year.`;

  const userPrompt = `Extract the top ${count} features from this release:

Tool: ${release.toolDisplayName}
Version: ${release.version}
Release Date: ${formattedDate}
Summary: ${release.summary}
URL: ${release.url}

Focus on the most impactful user-facing features. If the summary is limited, infer likely features based on the version number and tool type.`;

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

Header: "${config.displayName}" with "${features.releaseDate} Release" subtitle
Layout: Dark background, ${features.features.length} feature cards in ${format === '9:16' ? '2x3 vertical' : '2x3'} grid with subtle glow effects
Feature Cards:
${featureCards}
Footer: "havoptic.com" with "Track AI Tool Releases" tagline
Style: ${config.style}, brand color ${config.primaryColor}, high contrast, readable text, professional tech aesthetic
Highlight: "${features.releaseHighlight}"`;
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
  const release = getLatestRelease(data.releases, options.tool);

  if (!release) {
    console.error(`Error: No releases found for tool "${options.tool}"`);
    process.exit(1);
  }

  console.log(`Latest release: ${release.version} (${release.date})`);
  console.log(`Summary: ${release.summary}\n`);

  // Initialize Anthropic client
  const client = new Anthropic();

  // Extract features
  console.log('Extracting features with Claude...');
  const features = await extractFeatures(client, release, options.count);
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
        await generateImage(prompt, imagePath);
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

// Generate standardized tool logos using Nano Banana Pro
// All logos will be 4:1 aspect ratio for consistent rendering
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'infographics', 'logos');

const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

// Tool logo configurations - each will be generated at 4:1 aspect ratio
const TOOL_LOGOS = [
  {
    id: 'claude-code',
    filename: 'claude-code.png',
    prompt: `Create a horizontal logo banner (800x200 pixels, 4:1 aspect ratio) for "CLAUDE CODE":

Design requirements:
- Bold "CLAUDE CODE" text as the main element
- Use orange/coral gradient colors (#f97316 to #D97706)
- Modern, clean tech aesthetic
- Dark background (#0f172a) or transparent
- The text should fill most of the horizontal space
- No icons needed, just clean typography
- Slight glow effect on text
- Professional developer tool branding

The logo should be suitable for overlaying on dark infographic backgrounds.`,
  },
  {
    id: 'cursor',
    filename: 'cursor.png',
    prompt: `Create a horizontal logo banner (800x200 pixels, 4:1 aspect ratio) for "CURSOR":

Design requirements:
- Left side: The Cursor cube/box icon (3D isometric style)
- Right side: "CURSOR" text in bold, modern font
- Purple color theme (#7c3aed)
- Dark background (#0f172a) or transparent
- The logo should fill the horizontal space well
- Clean, IDE-inspired aesthetic
- Professional developer tool branding

The logo should be suitable for overlaying on dark infographic backgrounds.`,
  },
  {
    id: 'gemini-cli',
    filename: 'gemini-cli.png',
    prompt: `Create a horizontal logo banner (800x200 pixels, 4:1 aspect ratio) for "GEMINI CLI":

Design requirements:
- Left side: Gemini sparkle/star icon
- Right side: "GEMINI CLI" text in bold, modern font
- Teal/cyan color theme (#00ACC1)
- Dark background (#0f172a) or transparent
- Clean Material Design aesthetic
- The logo should fill the horizontal space well
- Professional developer tool branding

The logo should be suitable for overlaying on dark infographic backgrounds.`,
  },
  {
    id: 'kiro-cli',
    filename: 'kiro-cli.png',
    prompt: `Create a horizontal logo banner (800x200 pixels, 4:1 aspect ratio) for "KIRO":

Design requirements:
- Bold "KIRO" text as the main element
- Purple accent color (#8B5CF6)
- Modern, cloud-native aesthetic
- Dark background (#0f172a) or transparent
- The text should fill most of the horizontal space
- Clean, professional typography
- AWS/cloud-inspired developer tool branding

The logo should be suitable for overlaying on dark infographic backgrounds.`,
  },
  {
    id: 'openai-codex',
    filename: 'openaicodex.png',
    prompt: `Create a horizontal logo banner (800x200 pixels, 4:1 aspect ratio) for "CODEX CLI":

Design requirements:
- Left side: Simple geometric icon or OpenAI-style hexagon
- Right side: "CODEX CLI" text in bold, modern font
- Emerald green color theme (#059669)
- Dark background (#0f172a) or transparent
- Minimalist, terminal-inspired aesthetic
- The logo should fill the horizontal space well
- Professional developer tool branding

The logo should be suitable for overlaying on dark infographic backgrounds.`,
  },
  {
    id: 'havoptic-footer',
    filename: 'havoptic-footer.png',
    prompt: `Create a horizontal footer logo banner (800x200 pixels, 4:1 aspect ratio) for "havoptic.com":

Design requirements:
- Left side: Stylized "H" lettermark with gradient (orange #f97316 to green #10b981 to purple #8b5cf6)
- Center: "havoptic.com" in clean, bold white text
- Right side: "Track AI Tool Releases" tagline in smaller gray text
- Dark background (#0f172a) or transparent
- Modern tech aesthetic with subtle circuit/tech patterns
- The branding should fill the horizontal space well
- Professional, premium feel

The logo should be suitable for overlaying on dark infographic backgrounds as a footer.`,
  },
];

async function generateLogo(ai, tool) {
  console.log(`\nGenerating "${tool.id}" logo...`);

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: tool.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    let imageData = null;

    for (const part of parts) {
      if (part.inlineData) {
        imageData = part.inlineData;
        break;
      }
    }

    if (!imageData) {
      console.log(`  No image generated for ${tool.id}`);
      return null;
    }

    const buffer = Buffer.from(imageData.data, 'base64');
    const extension = imageData.mimeType?.includes('png') ? 'png' : 'jpg';
    const filename = tool.filename.replace(/\.[^.]+$/, `.${extension}`);
    const filepath = path.join(OUTPUT_DIR, filename);

    await fs.writeFile(filepath, buffer);
    console.log(`  Saved: ${filepath}`);
    return filepath;
  } catch (err) {
    console.error(`  Error generating ${tool.id}: ${err.message}`);
    return null;
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY environment variable is required');
    process.exit(1);
  }

  // Parse CLI args to optionally generate specific logos
  const args = process.argv.slice(2);
  const specificTool = args.find(a => a.startsWith('--tool='))?.split('=')[1];

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey });

  console.log('Generating standardized tool logos (4:1 aspect ratio)...');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const toolsToGenerate = specificTool
    ? TOOL_LOGOS.filter(t => t.id === specificTool)
    : TOOL_LOGOS;

  if (toolsToGenerate.length === 0) {
    console.error(`Unknown tool: ${specificTool}`);
    console.error('Available tools:', TOOL_LOGOS.map(t => t.id).join(', '));
    process.exit(1);
  }

  const generated = [];

  for (const tool of toolsToGenerate) {
    const filepath = await generateLogo(ai, tool);
    if (filepath) {
      generated.push({ id: tool.id, path: filepath });
    }
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\n--- Summary ---');
  console.log(`Generated ${generated.length}/${toolsToGenerate.length} logos:`);
  for (const item of generated) {
    console.log(`  - ${item.id}: ${item.path}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// Generate havoptic footer logo options using Nano Banana Pro
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'infographics', 'logos');

const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

const LOGO_VARIATIONS = [
  {
    name: 'gradient-glow',
    prompt: `Create a horizontal footer logo banner (800x160 pixels) for "havoptic.com" - an AI tools tracking website:

Left side: Bold stylized "H" lettermark with vibrant gradient (orange #f97316 flowing to emerald green #10b981 to purple #8b5cf6), with subtle glow effect
Center: "havoptic.com" in clean, bold white text with slight text shadow
Right side: "Track AI Tool Releases" tagline in smaller light gray text

Style: Modern tech aesthetic, sleek and professional
Background: Transparent or very dark (#0f172a) with subtle gradient
The design should pop on dark backgrounds and look premium.
Make the "H" eye-catching with a 3D gradient glow effect.`,
  },
  {
    name: 'neon-tech',
    prompt: `Create a horizontal footer logo banner (800x160 pixels) for "havoptic.com":

Design a futuristic neon-style logo:
- "H" icon on left: Neon outline effect with multi-color glow (orange, green, purple spectrum)
- "havoptic.com" text: Clean white with subtle neon underline glow
- "Track AI Tool Releases" tagline: Smaller, light gray

Style: Cyberpunk/neon tech aesthetic, glowing edges, dark background (#0f172a)
The neon effect should be vibrant but professional, suitable for a tech website.
Make it look like premium developer tooling branding.`,
  },
  {
    name: 'minimal-premium',
    prompt: `Create a horizontal footer logo banner (800x160 pixels) for "havoptic.com":

Minimalist premium design:
- Left: Clean geometric "H" lettermark with gradient fill (orange to green to purple diagonal)
- "havoptic.com" in elegant sans-serif white typography
- "Track AI Tool Releases" as subtle tagline

Style: Apple-like minimal premium aesthetic
Background: Dark slate (#0f172a) or transparent
Very clean, lots of whitespace, sophisticated tech branding.
The logo should look like it belongs to a premium SaaS product.`,
  },
  {
    name: 'circuit-tech',
    prompt: `Create a horizontal footer logo banner (800x160 pixels) for "havoptic.com":

Tech circuit board inspired design:
- "H" lettermark: Constructed from circuit-like patterns, gradient colored (orange/green/purple nodes)
- "havoptic.com" text: Modern tech font in white
- "Track AI Tool Releases" tagline: Light gray, smaller

Style: Developer-focused, circuit board aesthetic with glowing connection points
Background: Dark (#0f172a) with very subtle grid pattern
Professional but with interesting technical details.
Should appeal to software developers and tech enthusiasts.`,
  },
  {
    name: 'bold-modern',
    prompt: `Create a horizontal footer logo banner (800x160 pixels) for "havoptic.com":

Bold, modern startup branding:
- "H" icon: Bold, chunky 3D letter with vibrant gradient (orange #f97316 to green #10b981 to purple #8b5cf6)
- "havoptic.com" in bold modern sans-serif white text
- "Track AI Tool Releases" in accent color (light purple or gray)

Style: Y Combinator startup aesthetic, bold and confident
Background: Transparent or dark slate
Make it memorable and instantly recognizable.
The kind of logo you'd see on Product Hunt.`,
  },
];

async function generateLogo(ai, variation) {
  console.log(`\nGenerating "${variation.name}" variation...`);

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: variation.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '16:9', // Closest to horizontal banner
          imageSize: '2K',
        },
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
      console.log(`  No image generated for ${variation.name}`);
      return null;
    }

    const buffer = Buffer.from(imageData.data, 'base64');
    const extension = imageData.mimeType?.includes('png') ? 'png' : 'jpg';
    const filename = `havoptic-footer-${variation.name}.${extension}`;
    const filepath = path.join(OUTPUT_DIR, filename);

    await fs.writeFile(filepath, buffer);
    console.log(`  Saved: ${filepath}`);
    return filepath;
  } catch (err) {
    console.error(`  Error generating ${variation.name}: ${err.message}`);
    return null;
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY environment variable is required');
    process.exit(1);
  }

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey });

  console.log('Generating havoptic footer logo variations...');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const generated = [];

  for (const variation of LOGO_VARIATIONS) {
    const filepath = await generateLogo(ai, variation);
    if (filepath) {
      generated.push({ name: variation.name, path: filepath });
    }
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\n--- Summary ---');
  console.log(`Generated ${generated.length}/${LOGO_VARIATIONS.length} logo variations:`);
  for (const item of generated) {
    console.log(`  - ${item.name}: ${item.path}`);
  }
  console.log('\nReview the generated images and choose your favorite!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

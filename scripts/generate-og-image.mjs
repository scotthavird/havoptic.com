import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'og-image.png');

// Gemini 3 Pro Image model
const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

const PROMPT = `Create a professional 1200x630 pixel social media preview image for "Havoptic" - an AI coding tool release tracker website.

Design Requirements:
- Dark gradient background (deep slate/navy, similar to #0f172a to #1e293b)
- "Havoptic" as the main title in large, modern sans-serif font (white/light)
- Subtitle: "Track AI Coding Tool Releases" in smaller text below
- Visual representation of 5 AI tools as abstract geometric icons in a row:
  - Claude Code (amber/orange circle)
  - Codex CLI (emerald/green square)
  - Cursor (purple/violet rounded square)
  - Gemini CLI (teal/cyan pentagon)
  - Kiro CLI (purple hexagon)
- Each icon should glow subtly with its brand color
- Clean, minimal tech aesthetic with subtle grid pattern in background
- Professional and modern, appealing to developers
- Include small "havoptic.com" URL at bottom
- Aspect ratio: 1.91:1 (landscape, social media optimized)

Style: Premium developer tool aesthetic, dark mode, high contrast, subtle gradients, professional tech branding`;

async function generateOgImage() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Generating homepage OG image with Gemini...');
  console.log('Prompt:', PROMPT.slice(0, 100) + '...\n');

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: PROMPT,
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
  const finalPath = OUTPUT_PATH.replace(/\.[^.]+$/, `.${extension}`);

  await fs.writeFile(finalPath, buffer);
  console.log(`Generated: ${finalPath}`);
  console.log('\nHomepage OG image has been updated!');
}

generateOgImage().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

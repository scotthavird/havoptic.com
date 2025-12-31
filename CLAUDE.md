# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Havoptic is a React-based web application that displays a timeline of AI coding tool releases (Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, and Kiro CLI). It fetches release data from various sources and presents them in a filterable, chronological timeline with auto-generated infographics.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
npm run fetch-releases  # Fetch latest releases from sources (requires GITHUB_TOKEN)
npm run generate:infographic -- --tool=<id>  # Generate infographic for a tool
```

### Infographic Generation

```bash
# Generate infographic for latest release (requires .env with API keys)
node --env-file=.env scripts/generate-infographic-prompt.mjs \
  --tool=claude-code --generate-image --update-releases

# Generate for a specific old version
node --env-file=.env scripts/generate-infographic-prompt.mjs \
  --tool=cursor --version=2.3 --generate-image --update-releases --force

# Available flags:
#   --tool=<id>          Tool ID (claude-code, kiro, openai-codex, gemini-cli, cursor, aider)
#   --version=<ver>      Specific version (default: latest)
#   --generate-image     Generate image via Nano Banana Pro API
#   --update-releases    Save to public/ and update releases.json
#   --force              Regenerate even if infographic exists
#   --all-formats        Generate 1:1, 16:9, and 9:16 formats
```

## Architecture

### Data Flow
1. `scripts/fetch-releases.mjs` runs daily via GitHub Actions to scrape releases from:
   - Claude Code: npm registry + GitHub CHANGELOG.md
   - OpenAI Codex: GitHub Releases API
   - Cursor: Scrapes changelog page HTML
   - Gemini CLI: GitHub Releases API
   - Kiro CLI: Scrapes changelog page HTML
2. Results are written to `public/data/releases.json`
3. Sitemap is auto-updated with current date
4. `scripts/generate-infographic-prompt.mjs` runs after fetch to generate infographics:
   - Uses Claude API to extract top 6 features from release notes
   - Uses Nano Banana Pro (Gemini) to generate infographic images
   - Saves images to `public/images/infographics/`
   - Updates `releases.json` with `infographicUrl` field
5. React app fetches this JSON at runtime via `useReleases` hook

### Key Types (`src/types/release.ts`)
- `ToolId`: `'claude-code' | 'openai-codex' | 'cursor' | 'gemini-cli' | 'kiro'`
- `Release`: Individual release with id, tool, version, date, summary, url, type, infographicUrl
- `TOOL_CONFIG`: Display names and Tailwind color classes per tool

### Component Structure
- `App.tsx`: Root component with tool filter state
- `useReleases`: Hook that fetches releases.json and groups by year/month
- `Timeline`: Renders grouped releases by year → month
- `ToolFilter`: Filter buttons for each tool
- `ReleaseCard`: Individual release display with infographic and share buttons
- `ReleaseShareButtons`: Social sharing buttons (Twitter/X, LinkedIn, copy link)

### Custom Tailwind Colors
Defined in `tailwind.config.js`:
- `claude`: #D97706 (amber)
- `codex`: #059669 (emerald)
- `cursor`: #7C3AED (violet)
- `gemini`: #00ACC1 (teal)
- `kiro`: #8B5CF6 (purple)

## Infrastructure

Deployed to Cloudflare Pages. Terraform configs in `iac/`:
- `iac/prod/`: Production (havoptic.com, www.havoptic.com)
- `iac/dev/`: Development (dev.havoptic.com)

GitHub Actions deploy on push to main. Requires secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `ANTHROPIC_API_KEY` (for infographic feature extraction)
- `GOOGLE_API_KEY` (for Nano Banana Pro image generation)

### Environment Variables (Local Development)

Create a `.env` file in the project root:
```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

## Adding a New Tool

1. Add tool ID to `ToolId` type in `src/types/release.ts`
2. Add display config to `TOOL_CONFIG` in same file
3. Add Tailwind color in `tailwind.config.js`
4. Create fetch function in `scripts/fetch-releases.mjs`
5. Call new fetch function in `main()` Promise.all
6. Add tool config to `TOOL_CONFIGS` in `scripts/generate-infographic-prompt.mjs` with:
   - `displayName`: Uppercase tool name for infographic header
   - `primaryColor`: Brand color hex code
   - `style`: Description of visual style for image generation

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Havoptic is a React-based web application that displays a timeline of AI coding tool releases (Claude Code, OpenAI Codex CLI, Cursor). It fetches release data from various sources and presents them in a filterable, chronological timeline.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
npm run fetch-releases  # Fetch latest releases from sources (requires GITHUB_TOKEN)
```

## Architecture

### Data Flow
1. `scripts/fetch-releases.mjs` runs daily via GitHub Actions to scrape releases from:
   - Claude Code: npm registry + GitHub CHANGELOG.md
   - OpenAI Codex: GitHub Releases API
   - Cursor: Scrapes changelog page HTML
2. Results are written to `public/data/releases.json`
3. React app fetches this JSON at runtime via `useReleases` hook

### Key Types (`src/types/release.ts`)
- `ToolId`: `'claude-code' | 'openai-codex' | 'cursor'`
- `Release`: Individual release with id, tool, version, date, summary, url, type
- `TOOL_CONFIG`: Display names and Tailwind color classes per tool

### Component Structure
- `App.tsx`: Root component with tool filter state
- `useReleases`: Hook that fetches releases.json and groups by year/month
- `Timeline`: Renders grouped releases by year → month
- `ToolFilter`: Filter buttons for each tool
- `ReleaseCard`: Individual release display

### Custom Tailwind Colors
Defined in `tailwind.config.js`:
- `claude`: #D97706 (amber)
- `codex`: #059669 (emerald)
- `cursor`: #7C3AED (violet)

## Infrastructure

Deployed to Cloudflare Pages. Terraform configs in `iac/`:
- `iac/prod/`: Production (havoptic.com, www.havoptic.com)
- `iac/dev/`: Development (dev.havoptic.com)

GitHub Actions deploy on push to main. Requires secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Adding a New Tool

1. Add tool ID to `ToolId` type in `src/types/release.ts`
2. Add display config to `TOOL_CONFIG` in same file
3. Add Tailwind color in `tailwind.config.js`
4. Create fetch function in `scripts/fetch-releases.mjs`
5. Call new fetch function in `main()` Promise.all

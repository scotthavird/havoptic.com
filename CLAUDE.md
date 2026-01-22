# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

**IMPORTANT: Never commit directly to main.** Always use feature branches and pull requests.

### Creating a Feature Branch
```bash
git checkout main
git pull
git checkout -b feature/<feature-name>
```

### Workflow Steps
1. Create a feature branch from `main`
2. Make incremental commits with descriptive messages
3. Push to remote: `git push -u origin feature/<feature-name>`
4. Create a PR via `gh pr create`
5. Squash and merge via `gh pr merge <number> --squash --delete-branch`

### Branch Naming
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `docs/<name>` - Documentation updates
- `refactor/<name>` - Code refactoring

### Slash Commands

Use these commands to streamline the Git workflow:

- `/ship <description>` - Start a new feature: creates branch, tracks todos, commits incrementally
- `/feature <branch: description>` - Create feature branch and implement with incremental commits
- `/merge [pr-number]` - Squash merge PR to main, verify production deploy
- `/prs` - Show status of all pull requests

## Project Overview

Havoptic is a React-based web application that displays a timeline of AI coding tool releases (Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro CLI, GitHub Copilot CLI, Aider, and Windsurf). It fetches release data from various sources and presents them in a filterable, chronological timeline with auto-generated infographics.

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
#   --tool=<id>          Tool ID (claude-code, kiro, openai-codex, gemini-cli, cursor, aider, github-copilot, windsurf)
#   --version=<ver>      Specific version (default: latest)
#   --generate-image     Generate image via Nano Banana Pro API
#   --update-releases    Save to public/ and update releases.json
#   --force              Regenerate even if infographic exists
#   --all-formats        Generate 1:1, 16:9, and 9:16 formats
#   --use-stored-source  Use source content from existing features.json (offline regeneration)
```

### Infographic Validation

Validate that generated infographic features match actual release notes:

```bash
# Validate a specific tool's infographic
node --env-file=.env scripts/validate-infographic.mjs --tool=kiro

# Validate a specific version
node --env-file=.env scripts/validate-infographic.mjs --tool=gemini-cli --version=v0.22.0

# Validate all releases with infographics
node --env-file=.env scripts/validate-infographic.mjs --all
```

The validator compares extracted features against source URLs and reports:
- ✅ VERIFIED: Feature clearly mentioned in source
- 🟡 INFERRED: Reasonable inference from source
- ❌ FABRICATED: Not supported by source

## Architecture

### Data Flow
1. `scripts/fetch-releases.mjs` runs daily via GitHub Actions to scrape releases from:
   - Claude Code: npm registry + GitHub CHANGELOG.md
   - OpenAI Codex: GitHub Releases API
   - Cursor: Scrapes changelog page HTML
   - Gemini CLI: GitHub Releases API
   - Kiro CLI: Scrapes changelog page HTML
   - GitHub Copilot CLI: GitHub Releases API
   - Aider: GitHub Releases API
   - Windsurf: Scrapes changelog page HTML
2. Results are written to `public/data/releases.json`
3. Sitemap is auto-updated with current date
4. `scripts/generate-infographic-prompt.mjs` runs after fetch to generate infographics:
   - Uses Claude API to extract top 6 features from release notes
   - Uses Nano Banana Pro (Gemini) to generate infographic images
   - Saves images to `public/images/infographics/`
   - Updates `releases.json` with `infographicUrl` field
5. `scripts/notify-subscribers.mjs` sends email notifications when new releases are detected:
   - Compares old vs new releases to identify changes
   - Calls `/api/notify` endpoint with new releases
   - Endpoint reads subscribers from R2 and sends emails via AWS SES
6. React app fetches this JSON at runtime via `useReleases` hook

### Key Types (`src/types/release.ts`)
- `ToolId`: `'claude-code' | 'openai-codex' | 'cursor' | 'gemini-cli' | 'kiro' | 'github-copilot' | 'aider' | 'windsurf'`
- `Release`: Individual release with id, tool, version, date, summary, fullNotes, url, type, infographicUrl
- `TOOL_CONFIG`: Display names and Tailwind color classes per tool

### Release Notes Storage
- `summary`: Short excerpt (max 200 chars) for UI display
- `fullNotes`: Complete release notes for accurate infographic generation
- If `fullNotes` is sparse (<100 chars), the infographic script fetches from the URL

### Infographic Source Content Storage
Generated `features.json` files in `generated-prompts/` include source metadata:
- `sourceContent`: The exact text used for feature extraction (enables offline regeneration)
- `sourceUrl`: URL where content was fetched from
- `sourceOrigin`: Where content came from (`fullNotes`, `fetched`, or `stored`)
- `extractedAt`: ISO timestamp when extraction was performed

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
- `copilot`: #8534F3 (purple)
- `aider`: #22c55e (green)
- `windsurf`: #00D4AA (teal)

## Infrastructure

Deployed to Cloudflare Pages. Terraform configs in `iac/`:
- `iac/prod/`: Production (havoptic.com, www.havoptic.com)
- `iac/dev/`: Development (dev.havoptic.com)

GitHub Actions deploy on push to main. Requires secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `ANTHROPIC_API_KEY` (for infographic feature extraction)
- `GOOGLE_API_KEY` (for Nano Banana Pro image generation)
- `NOTIFY_API_KEY` (for newsletter notification authentication)

### Environment Variables (Local Development)

Create a `.env` file in the project root:
```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

## Newsletter System

Subscribers receive email notifications when new AI tool releases are detected.

### Components
- **Subscribe API** (`functions/api/subscribe.js`): Handles newsletter signups, stores in R2, sends admin notification
- **Unsubscribe API** (`functions/api/unsubscribe.js`): Handles unsubscribe requests, logs to audit trail, sends admin notification
- **Notify API** (`functions/api/notify.js`): Sends emails to subscribers via AWS SES
- **Notify Script** (`scripts/notify-subscribers.mjs`): Detects new releases and triggers notifications

### Infrastructure (Terraform)
- **R2 Bucket**: Stores `subscribers.json` with subscriber data and `newsletter-audit.json` for audit trail
- **AWS SES**: Email sending with verified domain (havoptic.com)
- **Cloudflare Pages Secrets**: AWS credentials and API key for notify endpoint

### Audit Trail
The `newsletter-audit.json` file in R2 tracks all subscribe/unsubscribe events:
```json
[
  {"action": "subscribe", "email": "user@example.com", "timestamp": "2025-01-10T12:00:00.000Z", "source": "website"},
  {"action": "unsubscribe", "email": "user@example.com", "timestamp": "2025-01-15T08:30:00.000Z", "originalSubscribedAt": "2025-01-10T12:00:00.000Z"}
]
```

### Testing Notifications Locally
```bash
# Test the notify endpoint
curl -X POST "https://havoptic.com/api/notify" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"YOUR_NOTIFY_API_KEY","releases":[...]}'
```

### Environment Variables (Cloudflare Pages)
Set via Terraform in `iac/*/web.tf`:
- `AWS_ACCESS_KEY_ID` - SES sender credentials
- `AWS_SECRET_ACCESS_KEY` - SES sender credentials
- `AWS_REGION` - SES region (us-east-1)
- `NOTIFY_API_KEY` - API authentication key
- `ADMIN_EMAIL` - Admin receives subscribe/unsubscribe notifications
- `NEWSLETTER_BUCKET` - R2 bucket binding

## Adding a New Tool

**CRITICAL: All 12 locations must be updated for full functionality.**

### Core Functionality (required for releases and infographics)
1. Add tool ID to `ToolId` type in `src/types/release.ts`
2. Add display config to `TOOL_CONFIG` in same file
3. Add Tailwind color in `tailwind.config.js`
4. Create fetch function in `scripts/fetch-releases.mjs`
5. Call new fetch function in `main()` Promise.all
6. Add tool config to `TOOL_CONFIGS` in `scripts/generate-infographic-prompt.mjs` with:
   - `displayName`: Uppercase tool name for infographic header
   - `primaryColor`: Brand color hex code
   - `style`: Description of visual style for image generation
7. **Add tool to `.github/workflows/generate-infographics.yml`** in TWO places:
   - The `options` list under `workflow_dispatch.inputs.tool` (for manual runs)
   - The `for tool in ...` loop in the generate step (for automated runs)

### SEO & Discoverability (required for search engines and LLMs)
8. Add tool to `TOOL_IDS` array in `scripts/generate-seo-assets.mjs`
9. Add tool to `TOOL_CONFIG` in `functions/tools/[[id]].js`
10. Add tool to `TOOL_CONFIG` in `functions/r/[[id]].js`
11. Update meta descriptions in `index.html` (title, description, keywords, OG tags, Twitter tags, structured data)
12. Add tool to `public/llms.txt` tracked tools list

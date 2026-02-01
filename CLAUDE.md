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
- `/quick <branch: description>` - End-to-end: create branch, implement, PR, wait for CI, merge, verify deploy
- `/merge [pr-number]` - Squash merge PR to main, verify production deploy
- `/prs` - Show status of all pull requests

## Project Overview

Havoptic is a React-based web application that displays a timeline of AI coding tool releases (Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro CLI, GitHub Copilot CLI, and Windsurf). It fetches release data from various sources and presents them in a filterable, chronological timeline with auto-generated infographics.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
npm run fetch-releases  # Fetch latest releases from sources (requires GITHUB_TOKEN)
npm run generate:infographic -- --tool=<id>  # Generate infographic for a tool
npm run setup:ga4 -- --property=<id>  # Configure GA4 via Admin API
```

### GA4 Setup

Configure Google Analytics 4 via the Admin API to create key events and custom dimensions:

```bash
# Prerequisites: Service account with Editor access on GA4 property
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Dry run (preview changes)
npm run setup:ga4 -- --property=YOUR_PROPERTY_ID

# Apply changes
npm run setup:ga4 -- --property=YOUR_PROPERTY_ID --apply
```

The script creates:
- Key event: `newsletter_success` (conversion tracking)
- Custom dimensions: `tool_name`, `event_category`, `version`, `method`, `link_url`, `percent_scrolled`

### Infographic Generation

```bash
# Generate infographic for latest release (requires .env with API keys)
node --env-file=.env scripts/generate-infographic-prompt.mjs \
  --tool=claude-code --generate-image --update-releases

# Generate for a specific old version
node --env-file=.env scripts/generate-infographic-prompt.mjs \
  --tool=cursor --version=2.3 --generate-image --update-releases --force

# Available flags:
#   --tool=<id>          Tool ID (claude-code, kiro, openai-codex, gemini-cli, cursor, github-copilot, windsurf)
#   --version=<ver>      Specific version (default: latest)
#   --generate-image     Generate image via Nano Banana Pro API
#   --update-releases    Save to public/ and update releases.json
#   --force              Regenerate even if infographic exists
#   --all-formats        Generate 1:1, 16:9, and 9:16 formats
#   --use-stored-source  Use source content from existing features.json (offline regeneration)
#   --all-missing        Generate for all recent releases missing infographics (ignores --tool)
#   --max-age-days=<n>   With --all-missing, limit to releases from last N days (default: 7)
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
- `ToolId`: `'claude-code' | 'openai-codex' | 'cursor' | 'gemini-cli' | 'kiro' | 'github-copilot' | 'windsurf'`
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

### Subscriber Preferences (Opt-Out Model)
Subscribers can control which tools and content types they receive notifications for.

**Tables** (see `scripts/db-migrations/003-subscriber-preferences.sql`):
- `subscriber_tool_preferences`: Per-tool opt-out (e.g., disable Claude Code updates)
- `subscriber_content_preferences`: Per-content-type opt-out (release, weekly-digest, monthly-comparison)

**Opt-Out Model**: No preference rows = receive everything. Only explicit opt-outs are stored.

**API** (`/api/preferences`):
```bash
# Get preferences
curl "https://havoptic.com/api/preferences?email=user@example.com"

# Update preferences (disable cursor and weekly-digest)
curl -X POST "https://havoptic.com/api/preferences" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","tools":{"cursor":false},"content":{"weekly-digest":false}}'
```

### Testing Notifications Locally

**Send test email directly via AWS SES** (uses default AWS credentials from `~/.aws/credentials`):
```bash
node scripts/send-test-email.mjs your-email@example.com
```

**Test via production API** (requires NOTIFY_API_KEY):
```bash
# Test release notification
curl -X POST "https://havoptic.com/api/notify" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"YOUR_NOTIFY_API_KEY","releases":[...]}'

# Test blog post notification
curl -X POST "https://havoptic.com/api/notify" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"YOUR_NOTIFY_API_KEY","blogPost":{"id":"weekly-digest-2026-w04","type":"weekly-digest","title":"...","tools":["claude-code"],"summary":"...","slug":"..."}}'
```

### Environment Variables (Cloudflare Pages)
Set via Terraform in `iac/*/web.tf`:
- `AWS_ACCESS_KEY_ID` - SES sender credentials
- `AWS_SECRET_ACCESS_KEY` - SES sender credentials
- `AWS_REGION` - SES region (us-east-1)
- `NOTIFY_API_KEY` - API authentication key
- `ADMIN_EMAIL` - Admin receives subscribe/unsubscribe notifications
- `NEWSLETTER_BUCKET` - R2 bucket binding
- `VAPID_PUBLIC_KEY` - Web Push VAPID public key (base64url)
- `VAPID_PRIVATE_KEY` - Web Push VAPID private key (base64url PKCS8)

## Browser Push Notifications

Logged-in users can enable browser push notifications to receive alerts when watched AI tools ship new releases.

### How It Works
1. User watches tools via the Watchlist feature (already implemented)
2. User clicks the bell icon in the header to enable browser notifications
3. Browser prompts for notification permission
4. When a watched tool ships a new release, browser notification appears
5. Clicking notification opens `havoptic.com/r/{releaseId}`

### Components
- **Service Worker** (`public/sw.js`): Handles push events and notification clicks
- **Push Subscribe API** (`functions/api/push/subscribe.js`): Registers push subscriptions
- **Push Unsubscribe API** (`functions/api/push/unsubscribe.js`): Removes subscriptions
- **VAPID Key API** (`functions/api/push/vapid-public-key.js`): Returns public key for subscription
- **Push Utilities** (`functions/api/_push-utils.js`): RFC 8291 encryption, D1 operations
- **React Hook** (`src/hooks/usePushNotifications.ts`): Permission and subscription management
- **Toggle Component** (`src/components/PushNotificationToggle.tsx`): UI bell icon

### Database
Push subscriptions stored in D1 (see `scripts/db-migrations/005-push-subscriptions.sql`):
- `endpoint` - Push service URL
- `p256dh`, `auth` - Encryption keys
- `tool_filters` - JSON array synced with user's watchlist
- `failed_attempts` - Auto-cleanup after 3 failures

### VAPID Key Generation
Generate a new VAPID key pair (run once during initial setup):
```bash
node scripts/generate-vapid-keys.mjs
```
Add the generated keys to your Terraform variables (`terraform.tfvars`).

### Testing Push Notifications
Push notifications are sent automatically by `/api/notify` when new releases are detected.
The notification payload includes:
- `title`: Tool name + version
- `body`: Release summary (first 200 chars)
- `url`: Link to release page on Havoptic

### Browser Support
- Chrome, Edge, Firefox: Full support
- Safari (macOS 13+): Supported with limitations
- iOS Safari: Not supported (Apple restriction)

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

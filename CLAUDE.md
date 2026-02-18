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

## Two-Repo Architecture

This is the **public** repo containing the frontend, API functions, and deploy workflows. Proprietary pipeline scripts (release fetchers, infographic generators, blog generators, notification scripts, Terraform configs) live in the **private** `scotthavird/havoptic-scripts` repo.

Private repo workflows use a two-checkout pattern: they clone both repos, copy scripts into the public repo working tree, run them, then clean private scripts before committing generated data (releases.json, infographics, blog posts) back to this repo.

### What stays in this repo
- React frontend (`src/`)
- Cloudflare Pages functions (`functions/`)
- Public data (`public/data/`, `public/images/`)
- Deploy workflows (`deploy-prod.yml`, `deploy-dev.yml`)
- DB migrations (`scripts/db-migrations/`)
- SEO asset generation (`scripts/generate-seo-assets.mjs`)
- VAPID key generation (`scripts/generate-vapid-keys.mjs`)
- DB migration runner (`scripts/run-migrations.mjs`)

### What lives in havoptic-scripts (private)
- Release fetchers, infographic generators, blog generators
- Notification scripts, remediation scripts
- Terraform infrastructure configs
- CI workflows for data generation pipelines

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
```

## Architecture

### Data Flow
1. Release fetchers run in the private repo via GitHub Actions
2. Generated data (releases.json, infographics, blog posts) is committed to this repo
3. Push to `public/` on main triggers the deploy workflow
4. React app fetches this JSON at runtime via `useReleases` hook

### Key Types (`src/types/release.ts`)
- `ToolId`: `'claude-code' | 'openai-codex' | 'cursor' | 'gemini-cli' | 'kiro' | 'github-copilot' | 'windsurf'`
- `Release`: Individual release with id, tool, version, date, summary, fullNotes, url, type, infographicUrl
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
- `copilot`: #8534F3 (purple)
- `windsurf`: #00D4AA (teal)

## Infrastructure

Deployed to Cloudflare Pages. Terraform configs are in the private `havoptic-scripts` repo.

GitHub Actions deploy on push to main. Requires secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Newsletter System

Subscribers receive email notifications when new AI tool releases are detected.

### Double Opt-In Flow
The newsletter uses double opt-in to prevent abuse and ensure valid emails:

1. **User submits email** → Stored as `status: 'pending'` with `confirmation_token`
2. **Confirmation email sent** → Contains link to `/api/confirm?token=xxx`
3. **User clicks link** → Token validated, status changed to `'confirmed'`, welcome email sent
4. **Notifications only sent** to subscribers with `status: 'confirmed'`

Token expiration: 24 hours. Expired tokens require re-subscribing.

### Components
- **Subscribe API** (`functions/api/subscribe.js`): Stores pending subscriber, sends confirmation email
- **Confirm API** (`functions/api/confirm.js`): Validates token, confirms subscriber, sends welcome email
- **Unsubscribe API** (`functions/api/unsubscribe.js`): Handles unsubscribe requests, logs to audit trail
- **Notify API** (`functions/api/notify.js`): Sends emails to confirmed subscribers via AWS SES
- **Confirmation Page** (`src/pages/ConfirmationResult.tsx`): Shows success/error states after email confirmation

### Database Schema (D1)
See `scripts/db-migrations/006-double-opt-in.sql` for the double opt-in migration:
- `subscribers.status`: 'pending' or 'confirmed'
- `subscribers.confirmation_token`: Unique token for email verification
- `subscribers.token_expires_at`: Token expiration timestamp
- `subscribers.confirmed_at`: When email was verified

### Audit Trail
The `newsletter_audit` table tracks all subscription events:
```json
[
  {"action": "subscribe", "email": "user@example.com", "timestamp": "2025-01-10T12:00:00.000Z", "source": "website"},
  {"action": "confirm", "email": "user@example.com", "timestamp": "2025-01-10T12:05:00.000Z", "source": "email-verification"},
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

### Environment Variables (Cloudflare Pages)
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

### In this repo (public)
1. Add tool ID to `ToolId` type in `src/types/release.ts`
2. Add display config to `TOOL_CONFIG` in same file
3. Add Tailwind color in `tailwind.config.js`
4. Add tool to `TOOL_IDS` array in `scripts/generate-seo-assets.mjs`
5. Add tool to `TOOL_CONFIG` in `functions/tools/[[id]].js`
6. Add tool to `TOOL_CONFIG` in `functions/r/[[id]].js`
7. Update meta descriptions in `index.html` (title, description, keywords, OG tags, Twitter tags, structured data)
8. Add tool to `public/llms.txt` tracked tools list

### In havoptic-scripts repo (private)
9. Create fetch function in `scripts/fetch-releases.mjs`
10. Call new fetch function in `main()` Promise.all
11. Add tool config to `TOOL_CONFIGS` in `scripts/generate-infographic-prompt.mjs`
12. Add tool to `.github/workflows/generate-infographics.yml` options and generate loop

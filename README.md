# Havoptic

Track every release from the top AI coding tools — all in one place.

**Live site:** [havoptic.com](https://havoptic.com)

## Features

- Chronological release timeline grouped by year and month
- Filter by tool, with watchlist and browser push notifications
- Auto-generated infographic summaries for each release
- Tool comparison pages and trend analytics with external metrics
- Weekly digest and blog content generation
- Email newsletter with double opt-in and per-tool/content preferences
- GitHub OAuth authentication
- SEO-optimized pages with structured data, OG images, and `llms.txt`

## Supported Tools

| Tool | Source | Color |
|------|--------|-------|
| Claude Code | npm registry + GitHub CHANGELOG | Amber |
| OpenAI Codex CLI | GitHub Releases API | Emerald |
| Cursor | Changelog scraping | Violet |
| Gemini CLI | GitHub Releases API | Teal |
| Kiro CLI | Changelog scraping | Purple |
| GitHub Copilot CLI | GitHub Releases API | Purple |
| Windsurf | Changelog scraping | Teal |

## Quick Start

```bash
pnpm install
pnpm dev            # Start dev server
pnpm build          # TypeScript compile + Vite build + SEO assets
pnpm test           # Run tests
pnpm lint           # Run ESLint
pnpm fetch-releases # Fetch latest releases (GITHUB_TOKEN recommended)
```

## Project Structure

```
src/
├── components/       # React components (Timeline, ReleaseCard, ToolFilter, etc.)
├── hooks/            # useReleases, useMetrics, usePushNotifications, useBlogPosts
├── pages/            # Blog, Compare, Trends, Tool, ConfirmationResult
├── types/            # TypeScript types (ToolId, Release, ToolConfig)
└── App.tsx           # Root component with routing
scripts/
├── fetch-releases.mjs          # Scrape releases from all sources
├── fetch-external-metrics.mjs  # Fetch npm downloads, GitHub stars, etc.
├── generate-infographic-prompt.mjs  # AI-generated release infographics
├── generate-blog-content.mjs   # AI-generated blog posts and digests
├── generate-seo-assets.mjs     # Sitemap, robots.txt, llms.txt
├── notify-subscribers.mjs      # Email notifications for new releases
├── validate-infographic.mjs    # Verify infographic accuracy vs source
└── setup-ga4.mjs               # Configure GA4 events and dimensions
functions/                       # Cloudflare Pages Functions (API)
├── api/
│   ├── subscribe.js / confirm.js / unsubscribe.js  # Newsletter
│   ├── notify.js               # Release notification dispatch
│   ├── preferences.js          # Subscriber preferences
│   ├── push/                   # Browser push notification endpoints
│   ├── watchlist.js            # Tool watchlist management
│   ├── auth/                   # GitHub OAuth flow
│   └── metrics/                # Metrics API
├── r/[[id]].js                 # Release detail pages (SSR meta tags)
├── tools/[[id]].js             # Tool pages (SSR meta tags)
├── blog/[[slug]].js            # Blog post pages (SSR meta tags)
└── compare/[[slug]].js         # Comparison pages (SSR meta tags)
iac/
├── prod/                       # Terraform for havoptic.com
└── dev/                        # Terraform for dev.havoptic.com
public/
└── data/
    ├── releases.json           # Release data (auto-generated)
    └── external-metrics.json   # npm downloads, GitHub stars, etc.
```

## Data Flow

1. **Fetch releases** — GitHub Actions runs `fetch-releases.mjs` daily, scraping npm, GitHub APIs, and changelog pages
2. **Generate infographics** — Claude API extracts features, Nano Banana Pro generates images
3. **Notify subscribers** — Detects new releases and sends emails (via AWS SES) and push notifications to subscribers
4. **Deploy** — Cloudflare Pages deploys on push to `main`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | Increases GitHub API rate limits |
| `ANTHROPIC_API_KEY` | Claude API for feature extraction |
| `GOOGLE_API_KEY` | Nano Banana Pro for image generation |
| `CLOUDFLARE_API_TOKEN` | Deployment |
| `CLOUDFLARE_ACCOUNT_ID` | Deployment |
| `NOTIFY_API_KEY` | Newsletter notification auth |

For local development, create a `.env` file with `ANTHROPIC_API_KEY` and `GOOGLE_API_KEY`.

## Deployment

Hosted on Cloudflare Pages with infrastructure managed via Terraform (`iac/`).

GitHub Actions automatically:
- Fetches new releases daily
- Generates infographics for new releases
- Fetches external metrics (npm downloads, GitHub stars)
- Deploys to production on push to `main`

## Adding a New Tool

See the detailed checklist in [CLAUDE.md](./CLAUDE.md#adding-a-new-tool) — all 12 locations must be updated.

## Contributing

Contributions welcome! See:
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)

## License

MIT — see [LICENSE](./LICENSE) for details.

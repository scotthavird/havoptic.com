# Havoptic

A timeline of AI coding tool releases. Track the latest updates from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, and Kiro CLI.

**Live site:** [havoptic.com](https://havoptic.com)

## Features

- Chronological timeline of releases grouped by year and month
- Filter by tool to focus on specific products
- Auto-updated daily via GitHub Actions

## Supported Tools

| Tool | Source | Color |
|------|--------|-------|
| Claude Code | npm registry + GitHub CHANGELOG | Amber |
| OpenAI Codex CLI | GitHub Releases API | Emerald |
| Cursor | Changelog scraping | Violet |
| Gemini CLI | GitHub Releases API | Teal |
| Kiro CLI | Changelog scraping | Purple |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Fetch latest releases (requires GITHUB_TOKEN for higher rate limits)
npm run fetch-releases

# Build for production
npm run build
```

## Project Structure

```
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks (useReleases)
│   ├── types/           # TypeScript types
│   └── App.tsx          # Root component
├── scripts/
│   └── fetch-releases.mjs  # Release fetching script
├── public/
│   └── data/
│       └── releases.json   # Release data (auto-generated)
├── iac/                 # Terraform infrastructure configs
└── .github/workflows/   # GitHub Actions
```

## Adding a New Tool

1. Add tool ID to `ToolId` type in `src/types/release.ts`
2. Add display config to `TOOL_CONFIG` in the same file
3. Add Tailwind color in `tailwind.config.js`
4. Create fetch function in `scripts/fetch-releases.mjs`
5. Add the fetch function call to `Promise.all()` in `main()`

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Optional | Increases GitHub API rate limits for fetching releases |

## Deployment

The site is deployed to Cloudflare Pages. GitHub Actions automatically:
- Fetch new releases daily at 6 AM UTC
- Deploy to production on push to `main`

To deploy your own instance:
1. Fork this repository
2. Set up Cloudflare Pages
3. Add required secrets to GitHub Actions:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](./LICENSE) for details.

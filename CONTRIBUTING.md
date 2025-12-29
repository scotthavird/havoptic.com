# Contributing to Havoptic

Thanks for your interest in contributing to Havoptic! This document outlines how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/havoptic.com.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development

```bash
# Start development server
npm run dev

# Fetch latest releases (optional, requires GITHUB_TOKEN)
npm run fetch-releases

# Run linter
npm run lint

# Build for production
npm run build
```

## Adding a New Tool

See [CLAUDE.md](./CLAUDE.md) for detailed instructions on adding a new AI tool to the timeline.

## Pull Request Process

1. Ensure your code follows the existing style
2. Run `npm run lint` and fix any issues
3. Test your changes locally with `npm run dev`
4. Update documentation if needed
5. Create a PR with a clear description of your changes

## Commit Messages

We follow conventional commits. Examples:
- `feat: add new tool to timeline`
- `fix: correct date parsing for releases`
- `docs: update README with new instructions`
- `chore: update dependencies`

## Reporting Issues

- Use the GitHub issue templates for bugs and feature requests
- Search existing issues before creating a new one
- Provide as much detail as possible

## Code of Conduct

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Questions?

Open an issue or start a discussion on GitHub.

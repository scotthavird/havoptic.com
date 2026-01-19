# Add New CLI Tool

Add a new AI coding tool to the Havoptic timeline. This command guides through research, implementation, and integration of a new CLI tool.

## Arguments
- `$ARGUMENTS` - The name of the tool to add (e.g., "GitHub Copilot CLI", "Aider", "Continue")

## Instructions

### Phase 1: Research

1. **Identify the tool**:
   - Parse tool name from: `$ARGUMENTS`
   - Derive a kebab-case tool ID (e.g., "GitHub Copilot CLI" → `github-copilot`)

2. **Research the tool online**:
   - What is this tool? Get a brief description
   - Who makes it? (Company/organization)
   - What is the official website/repository?
   - Find documentation links for future reference

3. **Find release sources**:
   - Check if releases are on GitHub Releases API
   - Check if there's an npm package with version history
   - Check if there's a changelog page to scrape
   - Check for RSS/Atom feeds
   - Document the best source for fetching releases

4. **Determine brand colors**:
   - Find the tool's official brand color from their website/logo
   - Choose a hex color that represents the tool
   - Ensure it contrasts well with existing tool colors

5. **Present research summary to user**:
   - Display findings before proceeding
   - Ask for confirmation or corrections
   - Get approval for the tool ID, display name, color, and release source

### Phase 2: Implementation

6. **Create a feature branch**:
   - Ensure on main and up to date: `git checkout main && git pull`
   - Create branch: `git checkout -b feature/add-<tool-id>-tool`
   - Push to remote: `git push -u origin feature/add-<tool-id>-tool`

7. **Create todo list** with these tasks:
   - Add ToolId to src/types/release.ts
   - Add TOOL_CONFIG entry to src/types/release.ts
   - Add Tailwind color to tailwind.config.js
   - Create fetch function in scripts/fetch-releases.mjs
   - Add to main() Promise.all in scripts/fetch-releases.mjs
   - Add TOOL_CONFIGS entry in scripts/generate-infographic-prompt.mjs
   - Test the fetch script locally
   - Create pull request

8. **Update src/types/release.ts**:
   - Add new tool ID to the `ToolId` union type
   - Add new entry to `TOOL_CONFIG` with:
     - `displayName`: Human-readable name
     - `color`: `text-<tool-id>` class
     - `bgColor`: `bg-<tool-id>` class
     - `hashtag`: Social media hashtag (lowercase, no spaces)
   - Commit: `git add src/types/release.ts && git commit -m "feat: add <tool-name> to ToolId type" && git push`

9. **Update tailwind.config.js**:
   - Add new color to the `colors` extend section
   - Use the brand color hex identified in research
   - Commit: `git add tailwind.config.js && git commit -m "feat: add <tool-name> tailwind color" && git push`

10. **Update scripts/fetch-releases.mjs**:
    - Create new async function `fetch<ToolName>(existingIds)` following existing patterns
    - Choose appropriate method based on release source:
      - GitHub Releases API: follow `fetchOpenAICodex` pattern
      - Changelog scraping: follow `fetchCursor` or `fetchKiro` pattern
      - npm + changelog: follow `fetchClaudeCode` pattern
    - Add the new fetch function call to the `main()` function's Promise.all
    - Commit: `git add scripts/fetch-releases.mjs && git commit -m "feat: add <tool-name> release fetcher" && git push`

11. **Update scripts/generate-infographic-prompt.mjs**:
    - Add new entry to `TOOL_CONFIGS` object with:
      - `displayName`: UPPERCASE version for infographic header
      - `primaryColor`: Same hex as tailwind color
      - `style`: Description of visual style for image generation
    - Commit: `git add scripts/generate-infographic-prompt.mjs && git commit -m "feat: add <tool-name> infographic config" && git push`

### Phase 3: Testing & PR

12. **Test locally**:
    - Run `npm run fetch-releases` to test the new fetcher
    - Verify releases are added to `public/data/releases.json`
    - Run `npm run dev` and check the tool appears in the filter
    - Fix any issues found

13. **Create Pull Request**:
    - Create PR: `gh pr create --title "feat: Add <Tool Name> to timeline" --body "..."`
    - Include in PR body:
      - Summary of what was added
      - Links to documentation/release sources
      - Screenshot if helpful
    - Monitor CI: `gh pr checks --watch`
    - Report PR URL to user

## File Modification Reference

```
src/types/release.ts
├── ToolId type union (line ~1)
└── TOOL_CONFIG object (line ~22)

tailwind.config.js
└── colors object (line ~9)

scripts/fetch-releases.mjs
├── New fetch function (add after existing fetch functions)
└── main() Promise.all (search for "Promise.all")

scripts/generate-infographic-prompt.mjs
└── TOOL_CONFIGS object (line ~16)
```

## Example Tool Configurations

```typescript
// src/types/release.ts - ToolId
export type ToolId = 'claude-code' | 'openai-codex' | 'cursor' | 'gemini-cli' | 'kiro' | 'new-tool';

// src/types/release.ts - TOOL_CONFIG
'new-tool': {
  displayName: 'New Tool',
  color: 'text-newtool',
  bgColor: 'bg-newtool',
  hashtag: '#newtool',
},

// tailwind.config.js
'newtool': '#HEX_COLOR',

// scripts/generate-infographic-prompt.mjs - TOOL_CONFIGS
'new-tool': {
  displayName: 'NEW TOOL',
  primaryColor: '#HEX_COLOR',
  style: 'Description of visual style for image generation',
},
```

## Tips
- Research thoroughly before implementing - correct information saves rework
- Use existing fetch functions as templates - they handle edge cases
- Test locally before creating the PR
- The tool ID should be lowercase kebab-case
- Tailwind color names should be lowercase with no hyphens

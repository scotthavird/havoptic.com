---
name: review-ui
description: Run comprehensive UI/UX review using specialized agents
argument-hint: "[accessibility|responsive|consistency|interactions|performance|all] [file-path]"
allowed-tools: Bash, Read, Grep, Glob, Task
---

# UI/UX Review Command

Run comprehensive UI/UX reviews using specialized subagents.

## Arguments

- `$ARGUMENTS` can be:
  - `all` - Run all 5 review agents
  - `accessibility` - WCAG 2.1 AA compliance check
  - `responsive` - Mobile/tablet/desktop breakpoint review
  - `consistency` - Design system adherence
  - `interactions` - States, animations, feedback
  - `performance` - Loading, CLS, optimization
  - Multiple can be combined: `accessibility responsive`
  - Optional file path at end: `all src/components/NewComponent.tsx`

## Execution

### 1. Determine Scope

If a file path is provided in `$ARGUMENTS`, review that specific file.

Otherwise, find recently modified UI files:
```bash
git diff --name-only HEAD~5 -- '*.tsx' '*.jsx' '*.css' | head -20
```

If no git changes, ask user which files to review.

### 2. Parse Review Types

Extract which reviews to run from `$ARGUMENTS`:
- If contains "all" → run all 5 agents
- Otherwise, run only specified types

### 3. Run Reviews

For each review type requested, spawn the appropriate agent using the Task tool with the subagent definitions from `.claude/agents/`:

**Accessibility Review:**
```
Use Task tool to spawn accessibility-auditor agent.
Prompt: Review these files for WCAG 2.1 AA accessibility compliance: [file list]
```

**Responsive Review:**
```
Use Task tool to spawn responsive-design-reviewer agent.
Prompt: Review these files for responsive design issues across mobile/tablet/desktop: [file list]
```

**Visual Consistency Review:**
```
Use Task tool to spawn visual-consistency-checker agent.
Prompt: Review these files for design system consistency. First read tailwind.config.js for color tokens: [file list]
```

**Interaction Review:**
```
Use Task tool to spawn interaction-reviewer agent.
Prompt: Review these files for interaction patterns - hover, focus, loading, error states: [file list]
```

**Performance UX Review:**
```
Use Task tool to spawn performance-ux-analyzer agent.
Prompt: Review these files for performance UX issues - CLS, loading states, image optimization: [file list]
```

### 4. Run Agents in Parallel

When running multiple reviews, spawn agents in parallel using multiple Task tool calls in a single response for efficiency.

### 5. Compile Results

After all agents complete, compile a summary:

```markdown
# UI/UX Review Summary

## Files Reviewed
- [list of files]

## Critical Issues (Must Fix)
[Aggregate critical issues from all agents]

## High Priority Issues
[Aggregate high priority issues]

## Medium Priority Issues
[Aggregate medium issues]

## Scores
- Accessibility: XX/100
- Responsive: XX/100
- Visual Consistency: XX/100
- Interactions: XX/100
- Performance UX: XX/100
- **Overall: XX/100**

## Recommended Actions
1. [Most impactful fix]
2. [Second priority]
3. [etc.]
```

## Examples

Review all aspects of recent changes:
```
/review-ui all
```

Review accessibility only:
```
/review-ui accessibility
```

Review specific file for all aspects:
```
/review-ui all src/components/WatchButton.tsx
```

Review multiple aspects:
```
/review-ui accessibility responsive interactions
```

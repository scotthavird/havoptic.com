---
name: ui-review
description: Auto-invoke to review UI/UX quality after implementing or modifying user interface components. Applies when working with .tsx, .jsx, .css files.
---

# UI/UX Review Skill

This skill should be auto-invoked after completing UI work to ensure quality, accessibility, and consistency.

## When to Invoke

Automatically consider running UI review after:
- Creating new React components (.tsx, .jsx)
- Modifying existing UI components
- Adding interactive elements (buttons, forms, modals)
- Changing layouts or styling
- Adding images or media
- Implementing loading states or animations

## Quick Self-Check

Before spawning full agents, do a quick self-check:

### Accessibility Quick Check
- [ ] All buttons/links have accessible names
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Color isn't the only indicator

### Responsive Quick Check
- [ ] No fixed pixel widths without max-width
- [ ] Touch targets >= 44px
- [ ] Mobile-first responsive classes

### Consistency Quick Check
- [ ] Uses project colors (claude, codex, cursor, etc.)
- [ ] Uses Tailwind spacing scale
- [ ] Matches existing component patterns

### Interaction Quick Check
- [ ] Hover states on clickable elements
- [ ] Loading states on async actions
- [ ] Focus visible on interactive elements

### Performance Quick Check
- [ ] Images have dimensions/aspect-ratio
- [ ] Async content has loading skeleton
- [ ] Uses LazyImage for below-fold images

## When to Use Full Agents

Spawn specialized agents from `.claude/agents/` when:

1. **accessibility-auditor** - New forms, modals, complex interactions, navigation changes
2. **responsive-design-reviewer** - New layouts, significant styling changes
3. **visual-consistency-checker** - New components, theme changes, design system additions
4. **interaction-reviewer** - Interactive elements, state management, animations
5. **performance-ux-analyzer** - Images, data fetching, heavy components

## Usage

For quick review, use the quick self-check above.

For comprehensive review, use `/review-ui all` or specify specific aspects:
```
/review-ui accessibility
/review-ui responsive
/review-ui consistency
/review-ui interactions
/review-ui performance
/review-ui all
```

## Example Workflow

After implementing a new component:

1. Run quick self-check mentally
2. If significant UI work, run `/review-ui all`
3. Address critical and high priority issues
4. Re-run specific reviews if needed

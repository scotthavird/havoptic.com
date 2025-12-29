#!/usr/bin/env node
/**
 * PR Draft Generator for Backlink Submissions
 *
 * Generates properly-formatted PR drafts for awesome lists.
 * Analyzes each repo's CONTRIBUTING.md and PR templates.
 *
 * Usage:
 *   node scripts/generate-pr-draft.mjs <repo>           # Generate draft for specific repo
 *   node scripts/generate-pr-draft.mjs --batch          # Generate drafts for all Tier 1 & 2 repos
 *   node scripts/generate-pr-draft.mjs --submit <repo>  # Generate and submit PR
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Havoptic info for PR submissions
const HAVOPTIC = {
  name: 'Havoptic',
  url: 'https://havoptic.com',
  repo: 'https://github.com/scotthavird/havoptic.com',
  description: 'A free, open-source timeline tracking releases from AI coding tools including Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, and Kiro CLI. Auto-updated daily via GitHub Actions.',
  shortDescription: 'AI coding tool release tracker',
  license: 'MIT',
  tags: ['ai', 'coding', 'tools', 'releases', 'changelog', 'react', 'vite', 'cloudflare', 'open-source'],
};

function runGH(args, silent = true) {
  try {
    const result = execSync(`gh ${args}`, {
      encoding: 'utf-8',
      stdio: silent ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      maxBuffer: 10 * 1024 * 1024
    });
    return result;
  } catch (error) {
    return null;
  }
}

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

async function getRepoInfo(repo) {
  const result = runGH(`api repos/${repo} --jq '{name,description,html_url,default_branch}'`);
  return parseJSON(result);
}

async function getContributingGuidelines(repo) {
  // Try different common locations
  const files = ['CONTRIBUTING.md', 'contributing.md', '.github/CONTRIBUTING.md'];

  for (const file of files) {
    const result = runGH(`api repos/${repo}/contents/${file} --jq '.content' 2>/dev/null`);
    if (result) {
      try {
        const content = Buffer.from(result.trim(), 'base64').toString('utf-8');
        return { file, content };
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function getPRTemplate(repo) {
  // Try different common locations
  const files = [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/pull_request_template.md',
    'PULL_REQUEST_TEMPLATE.md',
    'pull_request_template.md',
    '.github/PULL_REQUEST_TEMPLATE/default.md',
  ];

  for (const file of files) {
    const result = runGH(`api repos/${repo}/contents/${file} --jq '.content' 2>/dev/null`);
    if (result) {
      try {
        const content = Buffer.from(result.trim(), 'base64').toString('utf-8');
        return { file, content };
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function getReadmeStructure(repo) {
  const result = runGH(`api repos/${repo}/contents/README.md --jq '.content' 2>/dev/null`);
  if (!result) return null;

  try {
    const content = Buffer.from(result.trim(), 'base64').toString('utf-8');

    // Extract section headers to understand structure
    const headers = content.match(/^#{1,3}\s+.+$/gm) || [];

    // Try to find where tools/projects are listed
    const sections = headers.map(h => h.replace(/^#+\s*/, '').trim());

    // Look for the most relevant section
    const relevantSections = sections.filter(s =>
      /tool|project|resource|app|service|site|web|software|util/i.test(s)
    );

    return {
      sections,
      relevantSections,
      hasTable: content.includes('|') && content.includes('---|'),
      hasBulletList: content.includes('- ['),
      sampleEntry: extractSampleEntry(content),
    };
  } catch {
    return null;
  }
}

function extractSampleEntry(content) {
  // Try to find a sample entry format

  // Table format: | [Name](url) | description |
  const tableMatch = content.match(/\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|([^|]+)\|/);
  if (tableMatch) {
    return {
      format: 'table',
      example: tableMatch[0],
    };
  }

  // Bullet format: - [Name](url) - description
  const bulletMatch = content.match(/-\s*\[([^\]]+)\]\(([^)]+)\)\s*[-–—]\s*(.+)/);
  if (bulletMatch) {
    return {
      format: 'bullet-dash',
      example: bulletMatch[0],
    };
  }

  // Simple bullet: - [Name](url)
  const simpleBullet = content.match(/-\s*\[([^\]]+)\]\(([^)]+)\)/);
  if (simpleBullet) {
    return {
      format: 'bullet-simple',
      example: simpleBullet[0],
    };
  }

  return null;
}

function generateEntry(structure) {
  if (!structure || !structure.sampleEntry) {
    // Default format
    return `- [${HAVOPTIC.name}](${HAVOPTIC.url}) - ${HAVOPTIC.shortDescription}`;
  }

  switch (structure.sampleEntry.format) {
    case 'table':
      return `| [${HAVOPTIC.name}](${HAVOPTIC.url}) | ${HAVOPTIC.shortDescription} |`;
    case 'bullet-dash':
      return `- [${HAVOPTIC.name}](${HAVOPTIC.url}) - ${HAVOPTIC.shortDescription}`;
    case 'bullet-simple':
      return `- [${HAVOPTIC.name}](${HAVOPTIC.url})`;
    default:
      return `- [${HAVOPTIC.name}](${HAVOPTIC.url}) - ${HAVOPTIC.shortDescription}`;
  }
}

function generatePRTitle(repoName) {
  return `Add ${HAVOPTIC.name} - ${HAVOPTIC.shortDescription}`;
}

function generatePRBody(repo, contributing, template, structure) {
  let body = '';

  // If there's a PR template, try to fill it in
  if (template) {
    body = fillTemplate(template.content);
  } else {
    // Default PR body
    body = `## Add ${HAVOPTIC.name}

**Website:** ${HAVOPTIC.url}
**Repository:** ${HAVOPTIC.repo}
**License:** ${HAVOPTIC.license}

### Description

${HAVOPTIC.description}

### Why it fits this list

${generateFitReason(repo)}

### Entry to add

\`\`\`markdown
${generateEntry(structure)}
\`\`\`

---

Thank you for maintaining this awesome list! 🙏
`;
  }

  return body;
}

function fillTemplate(template) {
  // Common template placeholders and how to fill them
  let filled = template;

  // Replace common placeholders
  const replacements = {
    '[ ] I have read': '[x] I have read',
    '[ ] This': '[x] This',
    '[ ] The': '[x] The',
    '[ ] My': '[x] My',
    '[ ] I': '[x] I',
    '[description]': HAVOPTIC.description,
    '[url]': HAVOPTIC.url,
    '[name]': HAVOPTIC.name,
    '**Description:**': `**Description:** ${HAVOPTIC.description}`,
    '**URL:**': `**URL:** ${HAVOPTIC.url}`,
    '**Link:**': `**Link:** ${HAVOPTIC.url}`,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    filled = filled.replace(new RegExp(escapeRegex(placeholder), 'gi'), value);
  }

  return filled;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateFitReason(repo) {
  const repoLower = repo.toLowerCase();

  if (repoLower.includes('ai') || repoLower.includes('coding')) {
    return 'Havoptic tracks releases from AI coding tools (Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro CLI), making it directly relevant to developers using AI-powered development tools.';
  }

  if (repoLower.includes('devtool') || repoLower.includes('developer')) {
    return 'Havoptic is a developer tool that helps engineers stay up-to-date with the latest AI coding assistant releases and features.';
  }

  if (repoLower.includes('react') || repoLower.includes('vite')) {
    return 'Havoptic is built with React and Vite, featuring a modern, performant architecture deployed on Cloudflare Pages.';
  }

  if (repoLower.includes('cloudflare')) {
    return 'Havoptic is deployed on Cloudflare Pages with Terraform-managed infrastructure, demonstrating modern edge deployment practices.';
  }

  if (repoLower.includes('open') || repoLower.includes('oss') || repoLower.includes('free')) {
    return 'Havoptic is 100% free and open-source (MIT license), with no tracking, no ads, and community-driven development.';
  }

  if (repoLower.includes('cli')) {
    return 'Havoptic tracks CLI tools for AI-assisted coding, including Claude Code, OpenAI Codex CLI, Gemini CLI, and Kiro CLI.';
  }

  return 'Havoptic provides value to developers by aggregating release information from multiple AI coding tools in one place, with auto-updates and RSS support.';
}

async function generateDraft(repo) {
  console.log(`\n📝 Generating PR draft for: ${repo}\n`);
  console.log('='.repeat(60));

  // Get repo info
  console.log('  Fetching repo info...');
  const repoInfo = await getRepoInfo(repo);
  if (!repoInfo) {
    console.log('  ❌ Could not fetch repo info');
    return null;
  }

  // Get contributing guidelines
  console.log('  Checking CONTRIBUTING.md...');
  const contributing = await getContributingGuidelines(repo);
  if (contributing) {
    console.log(`  ✅ Found: ${contributing.file}`);
  } else {
    console.log('  ⚠️  No CONTRIBUTING.md found');
  }

  // Get PR template
  console.log('  Checking PR template...');
  const template = await getPRTemplate(repo);
  if (template) {
    console.log(`  ✅ Found: ${template.file}`);
  } else {
    console.log('  ⚠️  No PR template found');
  }

  // Analyze README structure
  console.log('  Analyzing README structure...');
  const structure = await getReadmeStructure(repo);
  if (structure) {
    console.log(`  ✅ Format: ${structure.sampleEntry?.format || 'unknown'}`);
    if (structure.relevantSections.length > 0) {
      console.log(`  📍 Suggested section: ${structure.relevantSections[0]}`);
    }
  }

  // Generate the draft
  const draft = {
    repo,
    repoUrl: repoInfo.html_url,
    defaultBranch: repoInfo.default_branch,
    title: generatePRTitle(repo),
    body: generatePRBody(repo, contributing, template, structure),
    entry: generateEntry(structure),
    suggestedSection: structure?.relevantSections?.[0] || null,
    hasContributing: !!contributing,
    hasTemplate: !!template,
    entryFormat: structure?.sampleEntry?.format || 'bullet-dash',
  };

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 DRAFT PR\n');
  console.log(`Title: ${draft.title}`);
  console.log(`\nEntry to add:\n${draft.entry}`);
  console.log(`\nSuggested section: ${draft.suggestedSection || 'Check README for best fit'}`);
  console.log('\n--- PR Body ---\n');
  console.log(draft.body);

  return draft;
}

async function saveDraft(draft) {
  const draftsDir = path.join(__dirname, '..', 'pr-drafts');
  await fs.mkdir(draftsDir, { recursive: true });

  const safeRepoName = draft.repo.replace('/', '_');
  const draftPath = path.join(draftsDir, `${safeRepoName}.md`);

  const content = `# PR Draft: ${draft.repo}

**Generated:** ${new Date().toISOString()}
**Repo URL:** ${draft.repoUrl}
**Has CONTRIBUTING.md:** ${draft.hasContributing ? 'Yes' : 'No'}
**Has PR Template:** ${draft.hasTemplate ? 'Yes' : 'No'}
**Entry Format:** ${draft.entryFormat}

---

## PR Title

${draft.title}

## Entry to Add

\`\`\`markdown
${draft.entry}
\`\`\`

**Suggested Section:** ${draft.suggestedSection || 'Check README for best fit'}

## PR Body

${draft.body}

---

## Submission Checklist

- [ ] Reviewed repo's CONTRIBUTING.md
- [ ] Confirmed entry format matches existing entries
- [ ] Found correct section in README
- [ ] PR submitted
- [ ] Added to tracking in check-pr-status.mjs
`;

  await fs.writeFile(draftPath, content);
  console.log(`\n✅ Draft saved to: pr-drafts/${safeRepoName}.md`);

  return draftPath;
}

async function submitPR(repo, draft) {
  console.log(`\n🚀 Submitting PR to ${repo}...`);

  // Fork the repo first
  console.log('  Forking repository...');
  runGH(`repo fork ${repo} --clone=false`, false);

  // Get fork info
  const forkResult = runGH(`api user --jq '.login'`);
  const username = forkResult?.trim();
  if (!username) {
    console.log('  ❌ Could not get GitHub username');
    return null;
  }

  const forkRepo = `${username}/${repo.split('/')[1]}`;
  console.log(`  Fork: ${forkRepo}`);

  // Note: Actual README editing and PR creation would need more complex logic
  // This is a placeholder that shows what would need to happen
  console.log('\n⚠️  Auto-submit requires manual README editing.');
  console.log('    1. Clone your fork');
  console.log('    2. Add the entry to the appropriate section');
  console.log('    3. Create PR with the generated title and body');
  console.log(`\n    Fork URL: https://github.com/${forkRepo}`);

  return { fork: forkRepo, draft };
}

async function batchGenerate() {
  // Load discovered repos
  const jsonPath = path.join(__dirname, '..', 'discovered-repos.json');

  let discovered;
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    discovered = JSON.parse(content);
  } catch {
    console.log('❌ No discovered-repos.json found. Run npm run discover-repos first.');
    return;
  }

  const repos = [...(discovered.tier1 || []), ...(discovered.tier2 || [])].slice(0, 20);

  console.log(`\n📦 Generating drafts for ${repos.length} repos...\n`);

  const drafts = [];
  for (const repo of repos) {
    try {
      const draft = await generateDraft(repo.fullName);
      if (draft) {
        await saveDraft(draft);
        drafts.push(draft);
      }
    } catch (err) {
      console.log(`  ❌ Error processing ${repo.fullName}: ${err.message}`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ Generated ${drafts.length} PR drafts in pr-drafts/`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/generate-pr-draft.mjs <owner/repo>    Generate draft for specific repo
  node scripts/generate-pr-draft.mjs --batch         Generate drafts for Tier 1 & 2 repos
  node scripts/generate-pr-draft.mjs --submit <repo> Generate and attempt to submit PR

Examples:
  node scripts/generate-pr-draft.mjs enaqx/awesome-react
  node scripts/generate-pr-draft.mjs --batch
`);
    return;
  }

  if (args[0] === '--batch') {
    await batchGenerate();
  } else if (args[0] === '--submit' && args[1]) {
    const draft = await generateDraft(args[1]);
    if (draft) {
      await saveDraft(draft);
      await submitPR(args[1], draft);
    }
  } else {
    const draft = await generateDraft(args[0]);
    if (draft) {
      await saveDraft(draft);
    }
  }
}

main().catch(console.error);

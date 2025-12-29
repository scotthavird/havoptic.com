#!/usr/bin/env node
/**
 * Backlink Repo Discovery Script
 *
 * Finds awesome lists and directories where Havoptic could be submitted.
 * Checks activity, contribution guidelines, and relevance.
 *
 * Run with: node scripts/discover-repos.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Search queries to find relevant repos
const SEARCH_QUERIES = [
  'awesome ai tools',
  'awesome ai coding',
  'awesome developer tools',
  'awesome devtools',
  'awesome cli',
  'awesome react',
  'awesome vite',
  'awesome cloudflare',
  'awesome jamstack',
  'awesome static site',
  'awesome open source',
  'awesome free',
  'awesome github actions',
  'awesome terraform',
  'awesome typescript',
  'awesome nodejs',
  'awesome web scraping',
  'awesome changelog',
  'awesome release',
  'awesome productivity',
  'awesome indie',
  'awesome saas',
];

// Keywords that indicate a good fit for Havoptic
const RELEVANCE_KEYWORDS = [
  'ai', 'coding', 'developer', 'devtools', 'cli', 'tools',
  'react', 'vite', 'cloudflare', 'jamstack', 'static',
  'open source', 'oss', 'free', 'github', 'terraform',
  'typescript', 'nodejs', 'web', 'productivity', 'saas'
];

// Repos we've already submitted to or evaluated
const KNOWN_REPOS = new Set([
  'jamesmurdza/awesome-ai-devtools',
  'sourcegraph/awesome-code-ai',
  'mahseema/awesome-ai-tools',
  'eudk/awesome-ai-tools',
  'ripienaar/free-for-dev',
  'agamm/awesome-developer-first',
  'athivvat/awesome-devtools',
  'release-notes/awesome-changelog',
  'mezod/awesome-indie',
  'johackim/awesome-indiehackers',
  'thedaviddias/indie-dev-toolkit',
]);

function runGH(args) {
  try {
    const result = execSync(`gh ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
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

async function searchRepos(query) {
  console.log(`  Searching: "${query}"...`);
  const result = runGH(
    `search repos "${query}" --limit 50 --json fullName,description,stargazersCount,updatedAt,pushedAt`
  );

  if (!result) return [];

  const repos = parseJSON(result) || [];
  return repos.filter(r =>
    r.stargazersCount >= 100 && // At least 100 stars
    r.fullName.toLowerCase().includes('awesome') // Must be an awesome list
  );
}

function checkRepoActivity(repo) {
  const pushedAt = new Date(repo.pushedAt || repo.updatedAt);
  const monthsAgo = (Date.now() - pushedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo < 3) return { active: true, status: '🟢 Active' };
  if (monthsAgo < 12) return { active: true, status: '🟡 Semi-active' };
  return { active: false, status: '🔴 Inactive' };
}

function checkContributing(fullName) {
  // Check if repo has CONTRIBUTING.md
  const result = runGH(
    `api repos/${fullName}/contents/CONTRIBUTING.md --jq '.name' 2>/dev/null`
  );
  return result && result.trim() === 'CONTRIBUTING.md';
}

function calculateRelevance(repo) {
  const text = `${repo.fullName} ${repo.description || ''}`.toLowerCase();
  let score = 0;

  for (const keyword of RELEVANCE_KEYWORDS) {
    if (text.includes(keyword)) score += 1;
  }

  // Bonus for high stars
  if (repo.stargazersCount > 10000) score += 3;
  else if (repo.stargazersCount > 5000) score += 2;
  else if (repo.stargazersCount > 1000) score += 1;

  return score;
}

async function main() {
  console.log('🔍 Discovering repos for Havoptic backlinks\n');
  console.log('='.repeat(60));

  const allRepos = new Map();

  // Search all queries
  for (const query of SEARCH_QUERIES) {
    const repos = await searchRepos(query);
    for (const repo of repos) {
      if (!KNOWN_REPOS.has(repo.fullName) && !allRepos.has(repo.fullName)) {
        allRepos.set(repo.fullName, repo);
      }
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📊 Found ${allRepos.size} unique repos to evaluate\n`);
  console.log('='.repeat(60));

  // Evaluate each repo
  const evaluated = [];
  let count = 0;

  for (const [fullName, repo] of allRepos) {
    count++;
    process.stdout.write(`\rEvaluating ${count}/${allRepos.size}: ${fullName.substring(0, 40).padEnd(40)}`);

    const activity = checkRepoActivity(repo);
    const hasContributing = checkContributing(fullName);
    const relevance = calculateRelevance(repo);

    evaluated.push({
      fullName,
      description: repo.description || '',
      stars: repo.stargazersCount,
      activity: activity.status,
      isActive: activity.active,
      hasContributing,
      relevance,
      url: `https://github.com/${fullName}`,
    });

    // Small delay
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n\n' + '='.repeat(60));

  // Sort by relevance and stars
  evaluated.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return b.stars - a.stars;
  });

  // Filter to active repos only
  const activeRepos = evaluated.filter(r => r.isActive);

  // Group by tier
  const tier1 = activeRepos.filter(r => r.relevance >= 5);
  const tier2 = activeRepos.filter(r => r.relevance >= 3 && r.relevance < 5);
  const tier3 = activeRepos.filter(r => r.relevance >= 1 && r.relevance < 3);

  // Generate report
  let report = `# Discovered Repos for Backlink Submissions\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `Total discovered: ${evaluated.length}\n`;
  report += `Active repos: ${activeRepos.length}\n\n`;
  report += `---\n\n`;

  report += `## Tier 1: Best Fit (Relevance 5+)\n\n`;
  report += `| Repository | Stars | Activity | Contributing | Description |\n`;
  report += `|------------|-------|----------|--------------|-------------|\n`;
  for (const repo of tier1.slice(0, 30)) {
    const contrib = repo.hasContributing ? '✅' : '❌';
    const desc = (repo.description || '').substring(0, 60);
    report += `| [${repo.fullName}](${repo.url}) | ${repo.stars.toLocaleString()} | ${repo.activity} | ${contrib} | ${desc} |\n`;
  }

  report += `\n## Tier 2: Good Fit (Relevance 3-4)\n\n`;
  report += `| Repository | Stars | Activity | Contributing | Description |\n`;
  report += `|------------|-------|----------|--------------|-------------|\n`;
  for (const repo of tier2.slice(0, 30)) {
    const contrib = repo.hasContributing ? '✅' : '❌';
    const desc = (repo.description || '').substring(0, 60);
    report += `| [${repo.fullName}](${repo.url}) | ${repo.stars.toLocaleString()} | ${repo.activity} | ${contrib} | ${desc} |\n`;
  }

  report += `\n## Tier 3: Moderate Fit (Relevance 1-2)\n\n`;
  report += `| Repository | Stars | Activity | Contributing | Description |\n`;
  report += `|------------|-------|----------|--------------|-------------|\n`;
  for (const repo of tier3.slice(0, 30)) {
    const contrib = repo.hasContributing ? '✅' : '❌';
    const desc = (repo.description || '').substring(0, 60);
    report += `| [${repo.fullName}](${repo.url}) | ${repo.stars.toLocaleString()} | ${repo.activity} | ${contrib} | ${desc} |\n`;
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'DISCOVERED_REPOS.md');
  await fs.writeFile(reportPath, report);

  // Also save as JSON for further processing
  const jsonPath = path.join(__dirname, '..', 'discovered-repos.json');
  await fs.writeFile(jsonPath, JSON.stringify({
    generated: new Date().toISOString(),
    tier1: tier1.slice(0, 50),
    tier2: tier2.slice(0, 50),
    tier3: tier3.slice(0, 50),
  }, null, 2));

  console.log(`\n✅ Report saved to: DISCOVERED_REPOS.md`);
  console.log(`✅ JSON saved to: discovered-repos.json`);

  console.log(`\n📊 Summary:`);
  console.log(`   Tier 1 (Best Fit): ${tier1.length} repos`);
  console.log(`   Tier 2 (Good Fit): ${tier2.length} repos`);
  console.log(`   Tier 3 (Moderate): ${tier3.length} repos`);
  console.log(`   Total Active: ${activeRepos.length} repos`);
}

main().catch(console.error);

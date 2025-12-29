#!/usr/bin/env node
/**
 * PR Status Checker for Havoptic Backlink Submissions
 *
 * Checks the status of all submitted PRs and outputs a summary.
 * Run with: node scripts/check-pr-status.mjs
 */

import { execSync } from 'child_process';

// List of submitted PRs to track
const SUBMITTED_PRS = [
  // Tier 1: Perfect Fit
  { repo: 'jamesmurdza/awesome-ai-devtools', pr: 181 },
  { repo: 'sourcegraph/awesome-code-ai', pr: 80 },
  { repo: 'mahseema/awesome-ai-tools', pr: 516 },
  { repo: 'eudk/awesome-ai-tools', pr: 60 },
  // Tier 2: Strong Fit
  { repo: 'ripienaar/free-for-dev', pr: 3947 },
  { repo: 'agamm/awesome-developer-first', pr: 250 },
  { repo: 'athivvat/awesome-devtools', pr: 15 },
  // Add more PRs here as they are submitted
];

function getPRStatus(repo, prNumber) {
  try {
    const result = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json state,title,url,mergedAt,closedAt`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(result);
  } catch (error) {
    return { state: 'ERROR', error: error.message };
  }
}

function getStatusEmoji(state) {
  switch (state) {
    case 'MERGED': return '✅';
    case 'OPEN': return '📤';
    case 'CLOSED': return '❌';
    default: return '❓';
  }
}

async function main() {
  console.log('🔍 Checking PR Status for Havoptic Backlinks\n');
  console.log('='.repeat(60));

  const results = {
    merged: [],
    open: [],
    closed: [],
    error: []
  };

  for (const { repo, pr } of SUBMITTED_PRS) {
    const status = getPRStatus(repo, pr);
    const emoji = getStatusEmoji(status.state);

    console.log(`${emoji} ${repo} #${pr}`);
    console.log(`   State: ${status.state}`);
    if (status.url) console.log(`   URL: ${status.url}`);
    if (status.mergedAt) console.log(`   Merged: ${new Date(status.mergedAt).toLocaleDateString()}`);
    console.log('');

    if (status.state === 'MERGED') results.merged.push({ repo, pr });
    else if (status.state === 'OPEN') results.open.push({ repo, pr });
    else if (status.state === 'CLOSED') results.closed.push({ repo, pr });
    else results.error.push({ repo, pr });
  }

  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Merged: ${results.merged.length}`);
  console.log(`   📤 Open: ${results.open.length}`);
  console.log(`   ❌ Closed/Rejected: ${results.closed.length}`);
  console.log(`   ❓ Errors: ${results.error.length}`);
  console.log(`   📈 Acceptance Rate: ${results.merged.length}/${SUBMITTED_PRS.length} (${Math.round(results.merged.length / SUBMITTED_PRS.length * 100)}%)`);
}

main().catch(console.error);

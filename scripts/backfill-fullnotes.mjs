#!/usr/bin/env node
/**
 * Backfill fullNotes for existing releases from GitHub API
 *
 * Usage: GITHUB_TOKEN=... node scripts/backfill-fullnotes.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Clean markdown for storage
function cleanMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

async function fetchGitHubRelease(owner, repo, tag) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'havoptic-release-tracker',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    if (res.status === 403 || res.status === 429) {
      console.log(`  Rate limited (${res.status})`);
      return 'rate_limited';
    }
    console.log(`  Failed to fetch ${tag}: ${res.status}`);
    return null;
  }

  return await res.json();
}

async function main() {
  console.log('Backfilling fullNotes for existing releases...\n');

  if (!GITHUB_TOKEN) {
    console.log('Warning: GITHUB_TOKEN not set. May hit rate limits.\n');
  }

  const content = await fs.readFile(DATA_PATH, 'utf-8');
  const data = JSON.parse(content);

  let updated = 0;
  let rateLimited = false;

  for (const release of data.releases) {
    if (rateLimited) break;

    // Skip if already has substantial fullNotes
    if (release.fullNotes && release.fullNotes.length > 100) {
      continue;
    }

    // Handle Gemini CLI
    if (release.tool === 'gemini-cli') {
      console.log(`Fetching fullNotes for ${release.id}...`);
      const ghRelease = await fetchGitHubRelease('google-gemini', 'gemini-cli', release.version);
      if (ghRelease === 'rate_limited') {
        rateLimited = true;
        break;
      }
      if (ghRelease && ghRelease.body) {
        release.fullNotes = cleanMarkdown(ghRelease.body);
        console.log(`  Updated with ${release.fullNotes.length} chars`);
        updated++;
        // Save after each successful update
        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
      }
      // Rate limit protection
      await new Promise((r) => setTimeout(r, 300));
    }

    // Handle OpenAI Codex
    if (release.tool === 'openai-codex') {
      console.log(`Fetching fullNotes for ${release.id}...`);
      const ghRelease = await fetchGitHubRelease('openai', 'codex', release.version);
      if (ghRelease === 'rate_limited') {
        rateLimited = true;
        break;
      }
      if (ghRelease && ghRelease.body) {
        release.fullNotes = cleanMarkdown(ghRelease.body);
        console.log(`  Updated with ${release.fullNotes.length} chars`);
        updated++;
        // Save after each successful update
        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
      }
      // Rate limit protection
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  if (rateLimited) {
    console.log(`\nRate limited after updating ${updated} releases. Run again later.`);
  } else if (updated > 0) {
    console.log(`\nUpdated ${updated} releases with fullNotes`);
  } else {
    console.log('\nNo releases needed updating');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

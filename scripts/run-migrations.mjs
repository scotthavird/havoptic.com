#!/usr/bin/env node
/**
 * Run all D1 database migrations in order
 *
 * Usage:
 *   node scripts/run-migrations.mjs <database-name>
 *
 * Example:
 *   node scripts/run-migrations.mjs havoptic-prod-auth
 *   node scripts/run-migrations.mjs havoptic-dev-auth
 *
 * This script:
 * 1. Finds all .sql files in scripts/db-migrations/
 * 2. Sorts them alphabetically (001-, 002-, etc.)
 * 3. Executes each one via wrangler d1 execute
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'db-migrations');

// Get database name from args
const dbName = process.argv[2];
if (!dbName) {
  console.error('Usage: node scripts/run-migrations.mjs <database-name>');
  console.error('Example: node scripts/run-migrations.mjs havoptic-prod-auth');
  process.exit(1);
}

// Find all migration files
const migrationFiles = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort(); // Alphabetical sort ensures 001, 002, 003 order

if (migrationFiles.length === 0) {
  console.log('No migration files found in scripts/db-migrations/');
  process.exit(0);
}

console.log(`Found ${migrationFiles.length} migration(s) to run:`);
migrationFiles.forEach(f => console.log(`  - ${f}`));
console.log('');

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run each migration with exponential backoff for transient Cloudflare API errors
let successCount = 0;
let failCount = 0;

for (const file of migrationFiles) {
  const filePath = `scripts/db-migrations/${file}`;
  let succeeded = false;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt === 1) {
      console.log(`Running: ${file}`);
    } else {
      console.log(`Retrying: ${file} (attempt ${attempt}/${MAX_RETRIES})`);
    }

    try {
      execSync(`npx wrangler d1 execute ${dbName} --remote --file=${filePath}`, {
        stdio: 'inherit',
      });
      console.log(`✓ ${file} completed\n`);
      succeeded = true;
      break;
    } catch (error) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 5s, 10s, 20s, 40s
      if (attempt < MAX_RETRIES) {
        console.error(`✗ ${file} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delayMs / 1000}s...\n`);
        await sleep(delayMs);
      } else {
        console.error(`✗ ${file} failed after ${MAX_RETRIES} attempts\n`);
      }
    }
  }

  if (succeeded) {
    successCount++;
  } else {
    failCount++;
    // Continue with other migrations - they use IF NOT EXISTS so order matters less
  }
}

console.log('---');
console.log(`Migrations complete: ${successCount} succeeded, ${failCount} failed`);

if (failCount > 0) {
  process.exit(1);
}

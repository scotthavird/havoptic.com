#!/usr/bin/env node
/**
 * Migrate newsletter data from R2 to D1
 *
 * Prerequisites:
 * 1. Run the D1 migration SQL first:
 *    wrangler d1 execute havoptic-prod-auth --file=scripts/db-migrations/002-newsletter-tables.sql --remote
 *
 * 2. Download subscribers.json from R2:
 *    wrangler r2 object get havoptic-prod-newsletter/subscribers.json --file=/tmp/subscribers.json
 *
 * 3. Download newsletter-audit.json from R2:
 *    wrangler r2 object get havoptic-prod-newsletter/newsletter-audit.json --file=/tmp/newsletter-audit.json
 *
 * Usage:
 *   node scripts/migrate-newsletter-to-d1.mjs --subscribers=/tmp/subscribers.json --audit=/tmp/newsletter-audit.json
 *
 * This script will:
 * 1. Read the local JSON files
 * 2. Generate SQL INSERT statements
 * 3. Print the SQL to stdout (pipe to wrangler d1 execute)
 *
 * Example:
 *   node scripts/migrate-newsletter-to-d1.mjs --subscribers=/tmp/subscribers.json --audit=/tmp/newsletter-audit.json > /tmp/migration.sql
 *   wrangler d1 execute havoptic-prod-auth --file=/tmp/migration.sql --remote
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const subscribersFile = args.find(a => a.startsWith('--subscribers='))?.split('=')[1];
const auditFile = args.find(a => a.startsWith('--audit='))?.split('=')[1];

if (!subscribersFile) {
  console.error('Usage: node scripts/migrate-newsletter-to-d1.mjs --subscribers=<file> [--audit=<file>]');
  console.error('');
  console.error('First, download the files from R2:');
  console.error('  wrangler r2 object get havoptic-prod-newsletter/subscribers.json --file=/tmp/subscribers.json');
  console.error('  wrangler r2 object get havoptic-prod-newsletter/newsletter-audit.json --file=/tmp/newsletter-audit.json');
  process.exit(1);
}

// Escape SQL string values
function escapeSql(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Read subscribers
let subscribers = [];
try {
  const data = readFileSync(subscribersFile, 'utf-8');
  subscribers = JSON.parse(data);
  console.error(`Read ${subscribers.length} subscribers from ${subscribersFile}`);
} catch (error) {
  console.error(`Error reading subscribers file: ${error.message}`);
  process.exit(1);
}

// Read audit log (optional)
let auditLog = [];
if (auditFile) {
  try {
    const data = readFileSync(auditFile, 'utf-8');
    auditLog = JSON.parse(data);
    console.error(`Read ${auditLog.length} audit entries from ${auditFile}`);
  } catch (error) {
    console.error(`Warning: Could not read audit file: ${error.message}`);
  }
}

// Generate SQL
console.log('-- Newsletter Migration from R2 to D1');
console.log('-- Generated at:', new Date().toISOString());
console.log('');

// Migrate subscribers
console.log('-- Subscribers');
console.log('BEGIN TRANSACTION;');
console.log('');

for (const subscriber of subscribers) {
  const id = randomUUID();
  const email = subscriber.email.trim().toLowerCase();
  const subscribedAt = subscriber.subscribedAt || new Date().toISOString();
  const source = subscriber.source || 'website';

  console.log(`INSERT OR IGNORE INTO subscribers (id, email, subscribed_at, source, created_at)`);
  console.log(`VALUES (${escapeSql(id)}, ${escapeSql(email)}, ${escapeSql(subscribedAt)}, ${escapeSql(source)}, ${escapeSql(subscribedAt)});`);
  console.log('');
}

console.log('COMMIT;');
console.log('');

// Migrate audit log
if (auditLog.length > 0) {
  console.log('-- Audit Log');
  console.log('BEGIN TRANSACTION;');
  console.log('');

  for (const entry of auditLog) {
    const action = entry.action;
    const email = entry.email.trim().toLowerCase();
    const timestamp = entry.timestamp || new Date().toISOString();
    const source = entry.source || null;
    const originalSubscribedAt = entry.originalSubscribedAt || null;

    console.log(`INSERT INTO newsletter_audit (action, email, timestamp, source, original_subscribed_at)`);
    console.log(`VALUES (${escapeSql(action)}, ${escapeSql(email)}, ${escapeSql(timestamp)}, ${escapeSql(source)}, ${escapeSql(originalSubscribedAt)});`);
    console.log('');
  }

  console.log('COMMIT;');
  console.log('');
}

console.log('-- Migration complete');
console.log(`-- Subscribers: ${subscribers.length}`);
console.log(`-- Audit entries: ${auditLog.length}`);

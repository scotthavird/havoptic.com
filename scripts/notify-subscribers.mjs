/**
 * Notify subscribers about new releases
 *
 * This script compares old and new releases.json files to identify
 * new releases and sends notifications to subscribers via the API.
 *
 * Usage:
 *   node scripts/notify-subscribers.mjs --old=<old-releases.json> --new=<new-releases.json>
 *
 * Environment variables:
 *   NOTIFY_API_KEY - API key for authentication
 *   NOTIFY_API_URL - API endpoint (default: https://havoptic.com/api/notify)
 */

import fs from 'fs/promises';

const NOTIFY_API_URL = process.env.NOTIFY_API_URL || 'https://havoptic.com/api/notify';
const NOTIFY_API_KEY = process.env.NOTIFY_API_KEY;

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const oldPath = args.find(a => a.startsWith('--old='))?.split('=')[1];
  const newPath = args.find(a => a.startsWith('--new='))?.split('=')[1];

  if (!oldPath || !newPath) {
    console.error('Usage: node scripts/notify-subscribers.mjs --old=<old-file> --new=<new-file>');
    process.exit(1);
  }

  if (!NOTIFY_API_KEY) {
    console.error('NOTIFY_API_KEY environment variable is required');
    process.exit(1);
  }

  // Load old and new releases
  let oldData, newData;
  try {
    const oldContent = await fs.readFile(oldPath, 'utf-8');
    oldData = JSON.parse(oldContent);
  } catch (err) {
    console.log('No old releases file found, treating as fresh start');
    oldData = { releases: [] };
  }

  try {
    const newContent = await fs.readFile(newPath, 'utf-8');
    newData = JSON.parse(newContent);
  } catch (err) {
    console.error('Error reading new releases file:', err.message);
    process.exit(1);
  }

  // Find new releases (in new but not in old)
  const oldIds = new Set(oldData.releases.map(r => r.id));
  const newReleases = newData.releases.filter(r => !oldIds.has(r.id));

  if (newReleases.length === 0) {
    console.log('No new releases to notify about');
    return;
  }

  console.log(`Found ${newReleases.length} new release(s):`);
  for (const release of newReleases) {
    console.log(`  - ${release.toolDisplayName} ${release.version}`);
  }

  // Send notification
  console.log('\nSending notifications...');
  try {
    const response = await fetch(NOTIFY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        releases: newReleases,
        apiKey: NOTIFY_API_KEY,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('API error:', result.error);
      process.exit(1);
    }

    console.log('Notification result:', result);
  } catch (err) {
    console.error('Error sending notification:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

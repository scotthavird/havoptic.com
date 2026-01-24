/**
 * Notify subscribers about new blog posts
 *
 * This script compares old and new posts.json files to identify
 * new blog posts and sends notifications to subscribers via the API.
 *
 * Usage:
 *   node scripts/notify-blog-subscribers.mjs --old=<old-posts.json> --new=<new-posts.json>
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
    console.error('Usage: node scripts/notify-blog-subscribers.mjs --old=<old-file> --new=<new-file>');
    process.exit(1);
  }

  if (!NOTIFY_API_KEY) {
    console.error('NOTIFY_API_KEY environment variable is required');
    process.exit(1);
  }

  // Load old and new posts
  let oldData, newData;
  try {
    const oldContent = await fs.readFile(oldPath, 'utf-8');
    oldData = JSON.parse(oldContent);
  } catch (err) {
    console.log('No old posts file found, treating as fresh start');
    oldData = { posts: [] };
  }

  try {
    const newContent = await fs.readFile(newPath, 'utf-8');
    newData = JSON.parse(newContent);
  } catch (err) {
    console.error('Error reading new posts file:', err.message);
    process.exit(1);
  }

  // Find new posts (in new but not in old)
  const oldIds = new Set(oldData.posts.map(p => p.id));
  const newPosts = newData.posts.filter(p => !oldIds.has(p.id));

  // Only notify for weekly-digest and monthly-comparison posts
  const notifiablePosts = newPosts.filter(p =>
    p.type === 'weekly-digest' || p.type === 'monthly-comparison'
  );

  if (notifiablePosts.length === 0) {
    console.log('No new blog posts to notify about');
    return;
  }

  console.log(`Found ${notifiablePosts.length} new blog post(s):`);
  for (const post of notifiablePosts) {
    console.log(`  - [${post.type}] ${post.title}`);
  }

  // Send notification for each post
  for (const post of notifiablePosts) {
    console.log(`\nSending notification for: ${post.title}`);
    try {
      const response = await fetch(NOTIFY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blogPost: post,
          apiKey: NOTIFY_API_KEY,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API error:', result.error);
        continue;
      }

      console.log('Notification result:', result);
    } catch (err) {
      console.error('Error sending notification:', err.message);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

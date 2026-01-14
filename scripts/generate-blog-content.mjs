import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateMonthlyComparison } from './generators/monthly-comparison.mjs';
import { generateWeeklyDigest } from './generators/weekly-digest.mjs';
import { generateToolDeepDive } from './generators/tool-deep-dive.mjs';
import { updateFeatureMatrix } from './generators/feature-matrix.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_PATH = path.join(__dirname, '..', 'public', 'data', 'blog', 'posts.json');

const TOOL_IDS = ['claude-code', 'openai-codex', 'cursor', 'gemini-cli', 'kiro'];

// Load existing blog posts
async function loadBlogPosts() {
  try {
    const content = await fs.readFile(BLOG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { lastUpdated: null, posts: [] };
  }
}

// Save blog posts
async function saveBlogPosts(data) {
  await fs.writeFile(BLOG_PATH, JSON.stringify(data, null, 2));
}

// Check if a post with given ID already exists
function postExists(posts, id) {
  return posts.some((p) => p.id === id);
}

// Generate weekly digest for last week
async function runWeeklyDigest(existingPosts) {
  console.log('\n=== Weekly Digest ===');

  try {
    const post = await generateWeeklyDigest();
    if (post && !postExists(existingPosts, post.id)) {
      console.log(`New post: ${post.id}`);
      return post;
    } else if (post) {
      console.log(`Post already exists: ${post.id}`);
    }
  } catch (err) {
    console.error('Weekly digest error:', err.message);
  }

  return null;
}

// Generate monthly comparison for last month
async function runMonthlyComparison(existingPosts) {
  console.log('\n=== Monthly Comparison ===');

  try {
    const post = await generateMonthlyComparison();
    if (post && !postExists(existingPosts, post.id)) {
      console.log(`New post: ${post.id}`);
      return post;
    } else if (post) {
      console.log(`Post already exists: ${post.id}`);
    }
  } catch (err) {
    console.error('Monthly comparison error:', err.message);
  }

  return null;
}

// Generate tool deep dives for last quarter (one per tool)
async function runToolDeepDives(existingPosts) {
  console.log('\n=== Tool Deep Dives ===');

  const newPosts = [];

  for (const toolId of TOOL_IDS) {
    try {
      const post = await generateToolDeepDive(toolId);
      if (post && !postExists(existingPosts, post.id)) {
        console.log(`New post: ${post.id}`);
        newPosts.push(post);
      } else if (post) {
        console.log(`Post already exists: ${post.id}`);
      }
    } catch (err) {
      console.error(`Deep dive error for ${toolId}:`, err.message);
    }
  }

  return newPosts;
}

// Determine what to generate based on schedule
function getScheduledTasks(now = new Date()) {
  const tasks = {
    weekly: false,
    monthly: false,
    quarterly: false,
    featureMatrix: false,
  };

  // Weekly: Run on Mondays
  if (now.getDay() === 1) {
    tasks.weekly = true;
  }

  // Monthly: Run on 1st of month
  if (now.getDate() === 1) {
    tasks.monthly = true;
  }

  // Quarterly: Run on 1st of Jan, Apr, Jul, Oct
  if (now.getDate() === 1 && [0, 3, 6, 9].includes(now.getMonth())) {
    tasks.quarterly = true;
  }

  // Feature matrix: Always update
  tasks.featureMatrix = true;

  return tasks;
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    weekly: false,
    monthly: false,
    quarterly: false,
    featureMatrix: false,
    all: false,
    scheduled: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--weekly') options.weekly = true;
    else if (arg === '--monthly') options.monthly = true;
    else if (arg === '--quarterly') options.quarterly = true;
    else if (arg === '--feature-matrix') options.featureMatrix = true;
    else if (arg === '--all') options.all = true;
    else if (arg === '--scheduled') options.scheduled = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node generate-blog-content.mjs [options]

Options:
  --weekly          Generate weekly digest for last week
  --monthly         Generate monthly comparison for last month
  --quarterly       Generate tool deep dives for last quarter
  --feature-matrix  Update the feature comparison matrix
  --all             Generate all content types
  --scheduled       Generate based on current day (Mon=weekly, 1st=monthly, Q1=quarterly)
  --dry-run         Show what would be generated without saving
  --help, -h        Show this help message

Environment Variables:
  ANTHROPIC_API_KEY  Required for Claude content generation

Examples:
  node generate-blog-content.mjs --scheduled
  node generate-blog-content.mjs --weekly --monthly
  node generate-blog-content.mjs --all
`);
      process.exit(0);
    }
  }

  return options;
}

// Main function
async function main() {
  const options = parseArgs();

  console.log('Blog Content Generator');
  console.log('======================');

  // Determine tasks
  let tasks;
  if (options.scheduled) {
    tasks = getScheduledTasks();
    console.log('Running scheduled tasks for:', new Date().toLocaleDateString());
  } else if (options.all) {
    tasks = { weekly: true, monthly: true, quarterly: true, featureMatrix: true };
    console.log('Running all content types');
  } else {
    tasks = {
      weekly: options.weekly,
      monthly: options.monthly,
      quarterly: options.quarterly,
      featureMatrix: options.featureMatrix,
    };
  }

  // Check if any task is enabled
  if (!Object.values(tasks).some((v) => v)) {
    console.log('No tasks specified. Use --help for usage info.');
    process.exit(0);
  }

  console.log('Tasks:', Object.entries(tasks).filter(([, v]) => v).map(([k]) => k).join(', '));

  // Load existing posts
  const blogData = await loadBlogPosts();
  const existingPosts = blogData.posts;
  console.log(`Existing posts: ${existingPosts.length}`);

  const newPosts = [];

  // Run generators
  if (tasks.weekly) {
    const post = await runWeeklyDigest(existingPosts);
    if (post) newPosts.push(post);
  }

  if (tasks.monthly) {
    const post = await runMonthlyComparison(existingPosts);
    if (post) newPosts.push(post);
  }

  if (tasks.quarterly) {
    const posts = await runToolDeepDives(existingPosts);
    newPosts.push(...posts);
  }

  if (tasks.featureMatrix) {
    console.log('\n=== Feature Matrix ===');
    await updateFeatureMatrix(true); // Use AI analysis
  }

  // Save new posts
  if (newPosts.length > 0) {
    console.log(`\n=== Summary ===`);
    console.log(`Generated ${newPosts.length} new posts`);

    if (options.dryRun) {
      console.log('Dry run - not saving');
      for (const post of newPosts) {
        console.log(`- ${post.id}: ${post.title}`);
      }
    } else {
      // Merge with existing posts and sort by date
      const allPosts = [...existingPosts, ...newPosts].sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );

      await saveBlogPosts({
        lastUpdated: new Date().toISOString(),
        posts: allPosts,
      });

      console.log(`Saved to ${BLOG_PATH}`);
      for (const post of newPosts) {
        console.log(`- ${post.id}: ${post.title}`);
      }
    }
  } else {
    console.log('\n=== Summary ===');
    console.log('No new posts generated');
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

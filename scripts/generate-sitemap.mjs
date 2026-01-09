import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const SITEMAP_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

const BASE_URL = 'https://havoptic.com';

/**
 * Format date as YYYY-MM-DD for sitemap
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Generate sitemap XML from releases data
 */
async function generateSitemap() {
  console.log('Generating sitemap...');

  // Read releases data
  const data = await fs.readFile(DATA_PATH, 'utf8');
  const { releases } = JSON.parse(data);

  // Start XML
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  // Add homepage with today's date
  const today = formatDate(new Date().toISOString());
  lines.push('  <url>');
  lines.push(`    <loc>${BASE_URL}/</loc>`);
  lines.push(`    <lastmod>${today}</lastmod>`);
  lines.push('    <changefreq>daily</changefreq>');
  lines.push('    <priority>1.0</priority>');
  lines.push('  </url>');

  // Add each release
  for (const release of releases) {
    const releaseDate = formatDate(release.date);
    lines.push('  <url>');
    lines.push(`    <loc>${BASE_URL}/r/${release.id}</loc>`);
    lines.push(`    <lastmod>${releaseDate}</lastmod>`);
    lines.push('    <changefreq>never</changefreq>');
    lines.push('    <priority>0.8</priority>');
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  lines.push('');

  // Write sitemap
  await fs.writeFile(SITEMAP_PATH, lines.join('\n'), 'utf8');
  console.log(`Sitemap generated with ${releases.length + 1} URLs (homepage + ${releases.length} releases)`);
}

// Run
generateSitemap().catch((err) => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});

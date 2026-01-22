import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASES_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const BLOG_PATH = path.join(__dirname, '..', 'public', 'data', 'blog', 'posts.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

const SITE_URL = 'https://havoptic.com';

const TOOL_IDS = ['claude-code', 'openai-codex', 'cursor', 'gemini-cli', 'kiro', 'github-copilot', 'aider', 'windsurf'];

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemap(lastUpdated, releases, blogPosts) {
  const lastmod = lastUpdated
    ? new Date(lastUpdated).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/blog', priority: '0.9', changefreq: 'daily' },
    { loc: '/compare', priority: '0.8', changefreq: 'weekly' },
    { loc: '/trends', priority: '0.8', changefreq: 'weekly' },
  ];

  // Tool pages
  const toolPages = TOOL_IDS.map(toolId => ({
    loc: `/tools/${toolId}`,
    priority: '0.7',
    changefreq: 'daily',
  }));

  // Blog post pages
  const blogPages = blogPosts.map(post => ({
    loc: `/blog/${post.slug}`,
    priority: '0.6',
    changefreq: 'monthly',
    lastmod: new Date(post.publishedAt).toISOString().split('T')[0],
  }));

  // Release pages
  const releasePages = releases.slice(0, 200).map(release => ({
    loc: `/r/${release.id}`,
    priority: '0.5',
    changefreq: 'never',
    lastmod: new Date(release.date).toISOString().split('T')[0],
  }));

  const allPages = [...staticPages, ...toolPages, ...blogPages, ...releasePages];

  const urls = allPages.map(page => `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${page.lastmod || lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  console.log(`Generated sitemap.xml with ${allPages.length} URLs`);
}

async function generateImageSitemap(releases) {
  // Filter releases that have infographic images
  const releasesWithImages = releases.filter(r => r.infographicUrl || r.infographicUrl16x9);

  const urls = releasesWithImages.map(release => {
    const images = [];

    // Add 1:1 infographic if exists
    if (release.infographicUrl) {
      images.push(`      <image:image>
        <image:loc>${SITE_URL}${release.infographicUrl}</image:loc>
        <image:title>${escapeXml(`${release.toolDisplayName} v${release.version} Release Infographic`)}</image:title>
        <image:caption>${escapeXml(release.summary || `${release.toolDisplayName} version ${release.version} release highlights`)}</image:caption>
      </image:image>`);
    }

    // Add 16:9 infographic if exists
    if (release.infographicUrl16x9) {
      images.push(`      <image:image>
        <image:loc>${SITE_URL}${release.infographicUrl16x9}</image:loc>
        <image:title>${escapeXml(`${release.toolDisplayName} v${release.version} Release Infographic (16:9)`)}</image:title>
        <image:caption>${escapeXml(release.summary || `${release.toolDisplayName} version ${release.version} release highlights`)}</image:caption>
      </image:image>`);
    }

    return `  <url>
    <loc>${SITE_URL}/r/${release.id}</loc>
${images.join('\n')}
  </url>`;
  }).join('\n');

  const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  await fs.writeFile(path.join(DIST_DIR, 'sitemap-images.xml'), imageSitemap);
  console.log(`Generated sitemap-images.xml with ${releasesWithImages.length} releases containing images`);
}

async function generateRssFeed(releases, lastUpdated) {
  const recentReleases = releases.slice(0, 50);

  const items = recentReleases.map(release => {
    const pubDate = new Date(release.date).toUTCString();
    return `    <item>
      <title>${escapeXml(release.toolDisplayName)} v${escapeXml(release.version)}</title>
      <link>${escapeXml(release.url)}</link>
      <guid isPermaLink="false">${escapeXml(release.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(release.summary || 'No release notes available.')}</description>
      <category>${escapeXml(release.toolDisplayName)}</category>
    </item>`;
  }).join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Havoptic - AI Tool Releases</title>
    <link>${SITE_URL}/</link>
    <description>Latest releases from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro, GitHub Copilot CLI, Aider, and Windsurf</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(lastUpdated || Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  await fs.writeFile(path.join(DIST_DIR, 'feed.xml'), feed);
  console.log(`Generated feed.xml with ${recentReleases.length} items`);
}

async function generateJsonFeed(releases, lastUpdated) {
  const recentReleases = releases.slice(0, 50);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Havoptic - AI Tool Releases',
    home_page_url: SITE_URL,
    feed_url: `${SITE_URL}/feed.json`,
    description: 'Latest releases from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro, GitHub Copilot CLI, Aider, and Windsurf',
    language: 'en-US',
    authors: [
      {
        name: 'Havoptic',
        url: SITE_URL,
      }
    ],
    items: recentReleases.map(release => {
      const item = {
        id: release.id,
        url: release.url,
        title: `${release.toolDisplayName} v${release.version}`,
        content_text: release.summary || `${release.toolDisplayName} version ${release.version} released.`,
        date_published: new Date(release.date).toISOString(),
        tags: [release.tool, release.toolDisplayName],
      };

      // Add infographic image if available
      if (release.infographicUrl16x9) {
        item.image = `${SITE_URL}${release.infographicUrl16x9}`;
      } else if (release.infographicUrl) {
        item.image = `${SITE_URL}${release.infographicUrl}`;
      }

      // Add full notes if available
      if (release.fullNotes) {
        item.content_html = `<p>${release.summary || ''}</p><pre>${release.fullNotes}</pre>`;
      }

      return item;
    }),
  };

  await fs.writeFile(path.join(DIST_DIR, 'feed.json'), JSON.stringify(feed, null, 2));
  console.log(`Generated feed.json with ${recentReleases.length} items`);
}

async function generateStructuredData(releases) {
  const recentReleases = releases.slice(0, 100);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "AI Coding Tool Releases",
    "description": "Timeline of releases from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro, GitHub Copilot CLI, Aider, and Windsurf",
    "numberOfItems": recentReleases.length,
    "itemListElement": recentReleases.map((release, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "SoftwareApplication",
        "name": `${release.toolDisplayName} v${release.version}`,
        "applicationCategory": "DeveloperApplication",
        "softwareVersion": release.version,
        "datePublished": release.date.split('T')[0],
        "description": release.summary || `${release.toolDisplayName} version ${release.version}`,
        "url": release.url
      }
    }))
  };

  const dataDir = path.join(DIST_DIR, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, 'structured-data.json'),
    JSON.stringify(itemList, null, 2)
  );
  console.log(`Generated structured-data.json with ${recentReleases.length} items`);
}

async function main() {
  console.log('Generating SEO assets...\n');

  // Load releases data
  let releasesData = { lastUpdated: null, releases: [] };
  try {
    const content = await fs.readFile(RELEASES_PATH, 'utf-8');
    releasesData = JSON.parse(content);
    console.log(`Loaded ${releasesData.releases.length} releases`);
  } catch (err) {
    console.error('Error reading releases data:', err.message);
    console.log('Using empty releases data');
  }

  // Load blog posts data
  let blogData = { lastUpdated: null, posts: [] };
  try {
    const content = await fs.readFile(BLOG_PATH, 'utf-8');
    blogData = JSON.parse(content);
    console.log(`Loaded ${blogData.posts.length} blog posts\n`);
  } catch (err) {
    console.log('No blog posts found, using empty data\n');
  }

  // Ensure dist directory exists
  await fs.mkdir(DIST_DIR, { recursive: true });

  // Generate all assets
  await Promise.all([
    generateSitemap(releasesData.lastUpdated, releasesData.releases, blogData.posts),
    generateImageSitemap(releasesData.releases),
    generateRssFeed(releasesData.releases, releasesData.lastUpdated),
    generateJsonFeed(releasesData.releases, releasesData.lastUpdated),
    generateStructuredData(releasesData.releases),
  ]);

  console.log('\nSEO assets generated successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

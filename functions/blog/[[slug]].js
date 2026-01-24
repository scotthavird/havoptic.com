/**
 * Cloudflare Pages Function to handle dynamic OG meta tags for blog posts.
 * Intercepts /blog/{slug} URLs and injects post-specific OG tags.
 */

const BLOG_POST_TYPE_LABELS = {
  'monthly-comparison': 'Monthly Comparison',
  'weekly-digest': 'Weekly Digest',
  'tool-deep-dive': 'Tool Deep Dive',
};

/**
 * Find a blog post by slug from the blog posts data
 */
function findPost(posts, slug) {
  return posts.find((p) => p.slug === slug);
}

/**
 * Generate OG meta tags HTML for a specific blog post
 */
function generateOgTags(post, baseUrl) {
  const typeLabel = BLOG_POST_TYPE_LABELS[post.type] || post.type;
  const title = `${post.title} | Havoptic`;
  const description = post.summary || `${typeLabel} - AI coding tools analysis on Havoptic.`;

  // Use cover image if available, otherwise fall back to default
  const ogImage = post.coverImageUrl
    ? `${baseUrl}${post.coverImageUrl}`
    : `${baseUrl}/og-image.jpg`;

  const postUrl = `${baseUrl}/blog/${post.slug}`;

  return `
    <!-- Dynamic OG Tags for blog post: ${post.slug} -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${postUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(post.title)}" />
    <meta property="og:site_name" content="Havoptic" />
    <meta property="og:locale" content="en_US" />
    <meta property="article:published_time" content="${post.publishedAt}" />
    <meta property="article:section" content="${typeLabel}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${postUrl}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${escapeHtml(post.title)}" />
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Inject OG tags into the HTML by replacing existing OG tags
 */
function injectOgTags(html, ogTags) {
  // Remove existing OG and Twitter meta tags
  let modifiedHtml = html
    .replace(/<meta property="og:[^"]*"[^>]*>/g, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');

  // Inject new OG tags before </head>
  modifiedHtml = modifiedHtml.replace(
    '</head>',
    `${ogTags}</head>`
  );

  return modifiedHtml;
}

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Get slug from the URL path
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;

  if (!slug) {
    // No slug, redirect to blog index
    return Response.redirect(`${baseUrl}/#/blog`, 302);
  }

  try {
    // Fetch blog posts data
    const postsResponse = await fetch(`${baseUrl}/data/blog/posts.json`);
    if (!postsResponse.ok) {
      throw new Error('Failed to fetch blog posts');
    }
    const postsData = await postsResponse.json();

    // Find the specific post
    const post = findPost(postsData.posts || [], slug);

    if (!post) {
      // Post not found, redirect to blog index
      return Response.redirect(`${baseUrl}/#/blog`, 302);
    }

    // Fetch the original index.html
    const htmlResponse = await fetch(`${baseUrl}/index.html`);
    if (!htmlResponse.ok) {
      throw new Error('Failed to fetch index.html');
    }
    let html = await htmlResponse.text();

    // Generate and inject OG tags
    const ogTags = generateOgTags(post, baseUrl);
    html = injectOgTags(html, ogTags);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error processing blog post page:', error);
    // On error, redirect to blog index
    return Response.redirect(`${baseUrl}/#/blog`, 302);
  }
}

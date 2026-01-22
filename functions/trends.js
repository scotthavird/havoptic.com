/**
 * Cloudflare Pages Function to handle dynamic OG meta tags for the Trends page.
 * Intercepts /trends URLs and injects trends-specific OG tags.
 */

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
 * Generate OG meta tags HTML for the Trends page
 */
function generateOgTags(baseUrl, releaseCount) {
  const title = 'Trends & Insights | Havoptic';
  const description = releaseCount > 0
    ? `Analyze ${releaseCount}+ releases across 8 AI coding tools. View release frequency, version history charts, and development patterns for Claude Code, Cursor, Gemini CLI, and more.`
    : 'Analyze release patterns and trends across AI coding tools. View release frequency, version history charts, and development insights.';

  const ogImage = `${baseUrl}/og-image.jpg`;
  const pageUrl = `${baseUrl}/trends`;

  return `
    <!-- Dynamic OG Tags for Trends page -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Havoptic Trends and Insights" />
    <meta property="og:site_name" content="Havoptic" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${pageUrl}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="Havoptic Trends and Insights" />
  `;
}

/**
 * Inject OG tags into the HTML by replacing existing OG tags
 */
function injectOgTags(html, ogTags) {
  // Remove existing OG and Twitter meta tags
  let modifiedHtml = html
    .replace(/<meta property="og:[^"]*"[^>]*>/g, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');

  // Add redirect script for browser users
  const redirectScript = `
    <script>
      if (typeof window !== 'undefined' && !window.__ogCrawler) {
        window.location.replace('/#/trends');
      }
    </script>
  `;

  // Inject new OG tags and redirect script before </head>
  modifiedHtml = modifiedHtml.replace(
    '</head>',
    `${ogTags}${redirectScript}</head>`
  );

  return modifiedHtml;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  try {
    // Fetch releases data to get total release count
    const releasesResponse = await fetch(`${baseUrl}/data/releases.json`);
    let releaseCount = 0;
    if (releasesResponse.ok) {
      const releasesData = await releasesResponse.json();
      releaseCount = releasesData.releases?.length || 0;
    }

    // Fetch the original index.html
    const htmlResponse = await fetch(`${baseUrl}/index.html`);
    if (!htmlResponse.ok) {
      throw new Error('Failed to fetch index.html');
    }
    let html = await htmlResponse.text();

    // Generate and inject OG tags
    const ogTags = generateOgTags(baseUrl, releaseCount);
    html = injectOgTags(html, ogTags);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error processing trends page:', error);
    return Response.redirect(`${baseUrl}/#/trends`, 302);
  }
}

/**
 * Cloudflare Pages Function to handle OG meta tags for the compare page.
 */

/**
 * Generate OG meta tags HTML for the compare page
 */
function generateOgTags(baseUrl) {
  const title = 'Compare AI Coding Tools | Havoptic';
  const description = 'Compare features across Claude Code, Cursor, Gemini CLI, OpenAI Codex, and Kiro. See which AI coding tool is right for you.';
  const ogImage = `${baseUrl}/og-image.jpg`;
  const pageUrl = `${baseUrl}/compare`;

  return `
    <!-- Dynamic OG Tags for compare page -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="AI Coding Tools Feature Comparison" />
    <meta property="og:site_name" content="Havoptic" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${pageUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="AI Coding Tools Feature Comparison" />
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
        window.location.replace('/#/compare');
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
    // Fetch the original index.html
    const htmlResponse = await fetch(`${baseUrl}/index.html`);
    if (!htmlResponse.ok) {
      throw new Error('Failed to fetch index.html');
    }
    let html = await htmlResponse.text();

    // Generate and inject OG tags
    const ogTags = generateOgTags(baseUrl);
    html = injectOgTags(html, ogTags);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error processing compare page:', error);
    return Response.redirect(`${baseUrl}/#/compare`, 302);
  }
}

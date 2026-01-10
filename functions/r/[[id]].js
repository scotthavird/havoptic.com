/**
 * Cloudflare Pages Function to handle dynamic OG meta tags for release pages.
 * Intercepts /r/{release-id} URLs and injects release-specific OG tags.
 */

const TOOL_CONFIG = {
  'claude-code': { displayName: 'Claude Code', hashtag: '#claudecode' },
  'openai-codex': { displayName: 'OpenAI Codex CLI', hashtag: '#codexcli' },
  'cursor': { displayName: 'Cursor', hashtag: '#cursorai' },
  'gemini-cli': { displayName: 'Gemini CLI', hashtag: '#geminicli' },
  'kiro': { displayName: 'Kiro CLI', hashtag: '#kirocli' },
};

/**
 * Find a release by ID from the releases data
 */
function findRelease(releases, releaseId) {
  return releases.find((r) => r.id === releaseId);
}

/**
 * Generate OG meta tags HTML for a specific release
 */
function generateOgTags(release, baseUrl) {
  const toolConfig = TOOL_CONFIG[release.tool] || { displayName: release.tool };
  const title = `${release.toolDisplayName} v${release.version} | Havoptic`;
  const description = release.summary
    ? release.summary.slice(0, 200) + (release.summary.length > 200 ? '...' : '')
    : `Check out ${release.toolDisplayName} v${release.version} release notes on Havoptic.`;

  // Prefer 16:9 format for OG images (better for Twitter/LinkedIn), fall back to 1:1, then default
  const ogImage = release.infographicUrl16x9
    ? `${baseUrl}${release.infographicUrl16x9}`
    : release.infographicUrl
      ? `${baseUrl}${release.infographicUrl}`
      : `${baseUrl}/og-image.jpg`;

  // Determine dimensions based on which image we're using
  const is16x9 = release.infographicUrl16x9;
  const imageWidth = is16x9 ? '1200' : release.infographicUrl ? '1200' : '1200';
  const imageHeight = is16x9 ? '630' : release.infographicUrl ? '1200' : '630';

  const releaseUrl = `${baseUrl}/r/${release.id}`;

  return `
    <!-- Dynamic OG Tags for ${release.id} -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${releaseUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="${imageWidth}" />
    <meta property="og:image:height" content="${imageHeight}" />
    <meta property="og:image:alt" content="${escapeHtml(`${release.toolDisplayName} v${release.version} release infographic`)}" />
    <meta property="og:site_name" content="Havoptic" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${releaseUrl}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${escapeHtml(`${release.toolDisplayName} v${release.version} release infographic`)}" />
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
function injectOgTags(html, ogTags, releaseId) {
  // Remove existing OG and Twitter meta tags
  let modifiedHtml = html
    .replace(/<meta property="og:[^"]*"[^>]*>/g, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');

  // Add redirect script for browser users (crawlers will just read the meta tags)
  const redirectScript = `
    <script>
      // Redirect browser users to the hash-based URL for SPA navigation
      if (typeof window !== 'undefined' && !window.__ogCrawler) {
        window.location.replace('/#${releaseId}');
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
  const { request, env, params } = context;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Get release ID from the URL path
  // params.id is an array for catch-all routes [[id]]
  const releaseId = Array.isArray(params.id) ? params.id.join('/') : params.id;

  if (!releaseId) {
    // No release ID, redirect to home
    return Response.redirect(baseUrl, 302);
  }

  try {
    // Fetch releases data
    const releasesResponse = await fetch(`${baseUrl}/data/releases.json`);
    if (!releasesResponse.ok) {
      throw new Error('Failed to fetch releases');
    }
    const releasesData = await releasesResponse.json();

    // Find the specific release
    const release = findRelease(releasesData.releases, releaseId);

    if (!release) {
      // Release not found, redirect to home
      return Response.redirect(`${baseUrl}/#`, 302);
    }

    // Fetch the original index.html
    const htmlResponse = await fetch(`${baseUrl}/index.html`);
    if (!htmlResponse.ok) {
      throw new Error('Failed to fetch index.html');
    }
    let html = await htmlResponse.text();

    // Generate and inject OG tags
    const ogTags = generateOgTags(release, baseUrl);
    html = injectOgTags(html, ogTags, releaseId);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error processing release page:', error);
    // On error, redirect to home with hash
    return Response.redirect(`${baseUrl}/#${releaseId}`, 302);
  }
}

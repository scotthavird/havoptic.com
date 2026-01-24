/**
 * Cloudflare Pages Function to handle dynamic OG meta tags for tool pages.
 * Intercepts /tools/{tool-id} URLs and injects tool-specific OG tags.
 */

const TOOL_CONFIG = {
  'claude-code': {
    displayName: 'Claude Code',
    description: 'Track Claude Code releases, features, and updates. Compare with other AI coding tools.',
    hashtag: '#claudecode',
  },
  'openai-codex': {
    displayName: 'OpenAI Codex CLI',
    description: 'Track OpenAI Codex CLI releases, features, and updates. Compare with other AI coding tools.',
    hashtag: '#codexcli',
  },
  'cursor': {
    displayName: 'Cursor',
    description: 'Track Cursor releases, features, and updates. Compare with other AI coding tools.',
    hashtag: '#cursorai',
  },
  'gemini-cli': {
    displayName: 'Gemini CLI',
    description: 'Track Gemini CLI releases, features, and updates. Compare with other AI coding tools.',
    hashtag: '#geminicli',
  },
  'kiro': {
    displayName: 'Kiro CLI',
    description: 'Track Kiro CLI releases, features, and updates. Compare with other AI coding tools.',
    hashtag: '#kirocli',
  },
  'github-copilot': {
    displayName: 'GitHub Copilot CLI',
    description: 'Track GitHub Copilot CLI releases, features, and updates. Compare with other AI coding tools.',
    hashtag: '#githubcopilot',
  },
  'aider': {
    displayName: 'Aider',
    description: 'Track Aider releases, features, and updates. AI pair programming in your terminal.',
    hashtag: '#aider',
  },
  'windsurf': {
    displayName: 'Windsurf',
    description: 'Track Windsurf releases, features, and updates. Codeium AI-powered IDE.',
    hashtag: '#windsurf',
  },
};

/**
 * Generate OG meta tags HTML for a specific tool page
 */
function generateOgTags(toolId, releaseCount, baseUrl) {
  const toolConfig = TOOL_CONFIG[toolId];
  if (!toolConfig) return null;

  const title = `${toolConfig.displayName} | Havoptic`;
  const description = releaseCount > 0
    ? `${releaseCount} releases tracked. ${toolConfig.description}`
    : toolConfig.description;

  const ogImage = `${baseUrl}/og-image.jpg`;
  const pageUrl = `${baseUrl}/tools/${toolId}`;

  return `
    <!-- Dynamic OG Tags for tool page: ${toolId} -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(`${toolConfig.displayName} on Havoptic`)}" />
    <meta property="og:site_name" content="Havoptic" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${pageUrl}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${escapeHtml(`${toolConfig.displayName} on Havoptic`)}" />
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

  // Get tool ID from the URL path
  const toolId = Array.isArray(params.id) ? params.id.join('/') : params.id;

  if (!toolId || !TOOL_CONFIG[toolId]) {
    // Unknown tool, redirect to home
    return Response.redirect(`${baseUrl}/#`, 302);
  }

  try {
    // Fetch releases data to get release count
    const releasesResponse = await fetch(`${baseUrl}/data/releases.json`);
    let releaseCount = 0;
    if (releasesResponse.ok) {
      const releasesData = await releasesResponse.json();
      releaseCount = releasesData.releases.filter((r) => r.tool === toolId).length;
    }

    // Fetch the original index.html
    const htmlResponse = await fetch(`${baseUrl}/index.html`);
    if (!htmlResponse.ok) {
      throw new Error('Failed to fetch index.html');
    }
    let html = await htmlResponse.text();

    // Generate and inject OG tags
    const ogTags = generateOgTags(toolId, releaseCount, baseUrl);
    html = injectOgTags(html, ogTags);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error processing tool page:', error);
    return Response.redirect(`${baseUrl}/#/tools/${toolId}`, 302);
  }
}

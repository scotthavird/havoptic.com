/**
 * Cloudflare Pages Function to handle dynamic OG meta tags for comparison pages.
 * Intercepts /compare/{tool1}-vs-{tool2} URLs and injects comparison-specific OG tags.
 */

const TOOL_CONFIG = {
  'claude-code': {
    displayName: 'Claude Code',
    shortName: 'Claude Code',
  },
  'openai-codex': {
    displayName: 'OpenAI Codex CLI',
    shortName: 'Codex CLI',
  },
  'cursor': {
    displayName: 'Cursor',
    shortName: 'Cursor',
  },
  'gemini-cli': {
    displayName: 'Gemini CLI',
    shortName: 'Gemini CLI',
  },
  'kiro': {
    displayName: 'Kiro CLI',
    shortName: 'Kiro',
  },
  'github-copilot': {
    displayName: 'GitHub Copilot CLI',
    shortName: 'Copilot',
  },
  'windsurf': {
    displayName: 'Windsurf',
    shortName: 'Windsurf',
  },
};

/**
 * Parse slug to extract tool IDs (e.g., "claude-code-vs-cursor")
 */
function parseSlug(slug) {
  if (!slug) return null;

  // Handle array (catch-all parameter)
  const fullSlug = Array.isArray(slug) ? slug.join('/') : slug;

  const match = fullSlug.match(/^([a-z-]+)-vs-([a-z-]+)$/);
  if (!match) return null;

  const tool1 = match[1];
  const tool2 = match[2];

  if (!TOOL_CONFIG[tool1] || !TOOL_CONFIG[tool2]) return null;

  return { tool1, tool2 };
}

/**
 * Generate OG meta tags HTML for a comparison page
 */
function generateOgTags(tool1, tool2, baseUrl) {
  const config1 = TOOL_CONFIG[tool1];
  const config2 = TOOL_CONFIG[tool2];

  const title = `${config1.shortName} vs ${config2.shortName} - Feature Comparison | Havoptic`;
  const description = `Compare ${config1.displayName} and ${config2.displayName}: features, release velocity, and capabilities. Find the right AI coding assistant for your workflow.`;

  const ogImage = `${baseUrl}/og-image.jpg`;
  const pageUrl = `${baseUrl}/compare/${tool1}-vs-${tool2}`;

  return `
    <!-- Dynamic OG Tags for comparison page: ${tool1} vs ${tool2} -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(`${config1.shortName} vs ${config2.shortName} Comparison`)}" />
    <meta property="og:site_name" content="Havoptic" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${pageUrl}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${escapeHtml(`${config1.shortName} vs ${config2.shortName} Comparison`)}" />

    <!-- SEO Keywords -->
    <meta name="keywords" content="${escapeHtml(`${config1.displayName}, ${config2.displayName}, ${tool1}, ${tool2}, comparison, ai coding tools, ai coding assistant, feature comparison, ${tool1} vs ${tool2}`)}" />

    <!-- Canonical URL -->
    <link rel="canonical" href="${pageUrl}" />
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
  // Remove existing title, description, OG and Twitter meta tags
  let modifiedHtml = html
    .replace(/<title>[^<]*<\/title>/g, '')
    .replace(/<meta name="description"[^>]*>/g, '')
    .replace(/<meta name="keywords"[^>]*>/g, '')
    .replace(/<meta property="og:[^"]*"[^>]*>/g, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/g, '')
    .replace(/<link rel="canonical"[^>]*>/g, '');

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

  // Parse the slug to extract tool IDs
  const tools = parseSlug(slug);

  if (!tools) {
    // Invalid comparison slug, redirect to main compare page
    return Response.redirect(`${baseUrl}/compare`, 302);
  }

  const { tool1, tool2 } = tools;

  try {
    // Fetch the original index.html
    const htmlResponse = await fetch(`${baseUrl}/index.html`);
    if (!htmlResponse.ok) {
      throw new Error('Failed to fetch index.html');
    }
    let html = await htmlResponse.text();

    // Generate and inject OG tags
    const ogTags = generateOgTags(tool1, tool2, baseUrl);
    html = injectOgTags(html, ogTags);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error processing comparison page:', error);
    return Response.redirect(`${baseUrl}/compare?tools=${tool1},${tool2}`, 302);
  }
}

import { useBlogPost } from '../hooks/useBlogPosts';
import { usePageMeta } from '../hooks/usePageMeta';
import { BreadcrumbSchema, getBlogPostBreadcrumbs } from '../components/BreadcrumbSchema';
import { Link } from '../components/Link';
import { BLOG_POST_TYPE_CONFIG } from '../types/blog';
import { TOOL_CONFIG, type ToolId } from '../types/release';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Simple markdown-to-HTML renderer for blog content
function renderMarkdown(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener">$1</a>')
    // Unordered lists
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4">$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.*)$/gim, '<li class="ml-4 list-decimal">$1</li>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-slate-900 rounded-lg p-4 my-4 overflow-x-auto"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Blockquotes
    .replace(/^>\s+(.*)$/gim, '<blockquote class="border-l-4 border-slate-600 pl-4 my-4 text-slate-400 italic">$1</blockquote>')
    // Tables (basic support)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      const isHeader = cells.every(c => c.trim().match(/^-+$/));
      if (isHeader) return '';
      const cellHtml = cells.map(c => `<td class="border border-slate-700 px-3 py-2">${c.trim()}</td>`).join('');
      return `<tr>${cellHtml}</tr>`;
    })
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="border-slate-700 my-8">')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4">')
    // Line breaks
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  html = `<p class="mb-4">${html}</p>`;

  // Clean up empty paragraphs and list handling
  html = html
    .replace(/<p class="mb-4"><\/p>/g, '')
    .replace(/<p class="mb-4">(<h[1-6])/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p class="mb-4">(<li)/g, '<ul class="list-disc mb-4">$1')
    .replace(/(<\/li>)<br>/g, '$1')
    .replace(/(<li[^>]*>.*<\/li>)(\s*<\/p>)/g, '$1</ul>')
    .replace(/<p class="mb-4">(<pre)/g, '$1')
    .replace(/(<\/pre>)<\/p>/g, '$1')
    .replace(/<p class="mb-4">(<table)/g, '$1')
    .replace(/(<\/table>)<\/p>/g, '$1')
    .replace(/<p class="mb-4">(<tr)/g, '<table class="w-full border-collapse border border-slate-700 mb-4">$1')
    .replace(/(<\/tr>)(\s*)(<\/p>)/g, '$1</table>');

  return html;
}

interface BlogPostProps {
  slug: string;
}

export function BlogPost({ slug }: BlogPostProps) {
  const { post, loading, error } = useBlogPost(slug);

  usePageMeta({
    title: post ? `${post.title} | Havoptic Blog` : 'Loading... | Havoptic Blog',
    description: post?.summary || 'Read insights about AI coding tools on Havoptic.',
  });

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-center py-12 text-slate-400">Loading post...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="text-center py-12 text-red-400" role="alert">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-8">
        <Link
          href="/blog"
          className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
        >
          &larr; Back to Blog
        </Link>
        <div className="text-center py-12 text-slate-400">
          <p className="text-xl mb-4">Post not found</p>
          <p className="text-sm">The blog post you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const typeConfig = BLOG_POST_TYPE_CONFIG[post.type];

  return (
    <div className="py-8">
      <BreadcrumbSchema items={getBlogPostBreadcrumbs(post.title, post.slug)} />
      <Link
        href="/blog"
        className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back to Blog
      </Link>

      <article className="max-w-3xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-700 text-slate-300">
              {typeConfig.displayName}
            </span>
            <time className="text-sm text-slate-500" dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{post.title}</h1>

          <p className="text-lg text-slate-400 mb-6">{post.summary}</p>

          {/* Tools mentioned */}
          <div className="flex items-center gap-2 flex-wrap">
            {post.tools.map((toolId) => {
              const config = TOOL_CONFIG[toolId as ToolId];
              return (
                <Link
                  key={toolId}
                  href={`/tools/${toolId}`}
                  className={`text-sm px-3 py-1 rounded ${config?.bgColor || 'bg-slate-600'} text-white hover:opacity-80 transition-opacity`}
                >
                  {config?.displayName || toolId}
                </Link>
              );
            })}
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-invert max-w-none text-slate-300"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {/* Metrics summary */}
        {post.metrics && (
          <aside className="mt-12 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Data Snapshot</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{post.metrics.totalReleases}</div>
                <div className="text-xs text-slate-500">Total Releases</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {Object.keys(post.metrics.releasesByTool).filter(
                    (k) => post.metrics.releasesByTool[k as ToolId] > 0
                  ).length}
                </div>
                <div className="text-xs text-slate-500">Active Tools</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{post.metrics.topFeatures.length}</div>
                <div className="text-xs text-slate-500">Featured Updates</div>
              </div>
              <div>
                <div
                  className={`text-2xl font-bold ${post.metrics.velocityChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {post.metrics.velocityChange > 0 ? '+' : ''}
                  {post.metrics.velocityChange}%
                </div>
                <div className="text-xs text-slate-500">Velocity Change</div>
              </div>
            </div>
          </aside>
        )}

        {/* Share buttons */}
        <div className="mt-8 pt-8 border-t border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Share this post</h3>
          <div className="flex gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://havoptic.com/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              Twitter/X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://havoptic.com/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              LinkedIn
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://havoptic.com/blog/${post.slug}`);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

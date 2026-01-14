import { useState } from 'react';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { BLOG_POST_TYPE_CONFIG, type BlogPostType } from '../types/blog';
import { TOOL_CONFIG, type ToolId } from '../types/release';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function BlogCard({ post }: { post: ReturnType<typeof useBlogPosts>['posts'][0] }) {
  const typeConfig = BLOG_POST_TYPE_CONFIG[post.type];

  return (
    <article className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-colors">
      <a href={`#/blog/${post.slug}`} className="block">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-700 text-slate-300">
            {typeConfig.displayName}
          </span>
          <span className="text-xs text-slate-500">{formatDate(post.publishedAt)}</span>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2 hover:text-blue-400 transition-colors">
          {post.title}
        </h2>

        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{post.summary}</p>

        <div className="flex items-center gap-2 flex-wrap">
          {post.tools.map((toolId) => {
            const config = TOOL_CONFIG[toolId as ToolId];
            return (
              <span
                key={toolId}
                className={`text-xs px-2 py-0.5 rounded ${config?.bgColor || 'bg-slate-600'} text-white`}
              >
                {config?.displayName || toolId}
              </span>
            );
          })}
        </div>
      </a>
    </article>
  );
}

export function Blog() {
  const [selectedType, setSelectedType] = useState<BlogPostType | 'all'>('all');
  const { posts, groupedByType, loading, error } = useBlogPosts(
    selectedType === 'all' ? {} : { type: selectedType }
  );

  return (
    <div className="py-8">
      <a
        href="#/"
        className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back to Timeline
      </a>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Insights</h1>
        <p className="text-slate-400">
          Analysis, comparisons, and deep dives into AI coding tools
        </p>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All Posts
        </button>
        {(Object.entries(BLOG_POST_TYPE_CONFIG) as [BlogPostType, typeof BLOG_POST_TYPE_CONFIG[BlogPostType]][]).map(
          ([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {config.displayName}
              {groupedByType[type] && (
                <span className="ml-2 text-xs opacity-70">({groupedByType[type].length})</span>
              )}
            </button>
          )
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400" aria-live="polite">
          Loading posts...
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-red-400" role="alert">
          Error: {error}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="mb-4">No blog posts yet.</p>
          <p className="text-sm">Check back soon for weekly digests and monthly comparisons!</p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

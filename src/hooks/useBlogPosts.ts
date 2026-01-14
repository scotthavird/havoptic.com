import { useState, useEffect, useMemo } from 'react';
import type { BlogPost, BlogPostType, BlogPostsData } from '../types/blog';
import type { ToolId } from '../types/release';

interface UseBlogPostsOptions {
  type?: BlogPostType;
  tool?: ToolId;
  limit?: number;
}

export function useBlogPosts(options: UseBlogPostsOptions = {}) {
  const [data, setData] = useState<BlogPostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBlogPosts() {
      try {
        const response = await fetch('/data/blog/posts.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch blog posts');
        }
        const json: BlogPostsData = await response.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchBlogPosts();

    return () => controller.abort();
  }, []);

  const filteredPosts = useMemo((): BlogPost[] => {
    if (!data?.posts) return [];

    let posts = [...data.posts];

    // Filter by type
    if (options.type) {
      posts = posts.filter((p) => p.type === options.type);
    }

    // Filter by tool
    if (options.tool) {
      posts = posts.filter((p) => p.tools.includes(options.tool!));
    }

    // Sort by published date (newest first)
    posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // Apply limit
    if (options.limit && options.limit > 0) {
      posts = posts.slice(0, options.limit);
    }

    return posts;
  }, [data, options.type, options.tool, options.limit]);

  // Group posts by type for navigation
  const groupedByType = useMemo((): Record<BlogPostType, BlogPost[]> => {
    const groups: Record<BlogPostType, BlogPost[]> = {
      'monthly-comparison': [],
      'weekly-digest': [],
      'tool-deep-dive': [],
    };

    if (!data?.posts) return groups;

    for (const post of data.posts) {
      if (groups[post.type]) {
        groups[post.type].push(post);
      }
    }

    // Sort each group by date
    for (const type of Object.keys(groups) as BlogPostType[]) {
      groups[type].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }

    return groups;
  }, [data]);

  return {
    posts: filteredPosts,
    groupedByType,
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error,
  };
}

export function useBlogPost(slug: string) {
  const { posts, loading, error } = useBlogPosts();

  const post = useMemo(() => {
    return posts.find((p) => p.slug === slug) ?? null;
  }, [posts, slug]);

  return {
    post,
    loading,
    error,
  };
}

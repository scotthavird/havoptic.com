import type { ToolId } from './release';

export type BlogPostType = 'monthly-comparison' | 'weekly-digest' | 'tool-deep-dive';

export interface BlogMetrics {
  totalReleases: number;
  releasesByTool: Record<ToolId, number>;
  topFeatures: Array<{ tool: ToolId; feature: string; description: string }>;
  velocityChange: number; // percentage change from previous period
}

export interface BlogSeo {
  keywords: string[];
  canonicalUrl: string;
}

export interface BlogPost {
  id: string;
  type: BlogPostType;
  title: string;
  slug: string;
  publishedAt: string;
  summary: string;
  content: string;
  coverImageUrl?: string;
  tools: ToolId[];
  metrics: BlogMetrics;
  seo: BlogSeo;
}

export interface BlogPostsData {
  lastUpdated: string | null;
  posts: BlogPost[];
}

export const BLOG_POST_TYPE_CONFIG: Record<BlogPostType, { displayName: string; description: string; icon: string }> = {
  'monthly-comparison': {
    displayName: 'Monthly Comparison',
    description: 'Monthly analysis of AI coding tools velocity and features',
    icon: 'chart-bar',
  },
  'weekly-digest': {
    displayName: 'Weekly Digest',
    description: 'Weekly roundup of AI coding tool releases',
    icon: 'newspaper',
  },
  'tool-deep-dive': {
    displayName: 'Tool Deep Dive',
    description: 'Quarterly in-depth analysis of a single tool',
    icon: 'magnifying-glass',
  },
};

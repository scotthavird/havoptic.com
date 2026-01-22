import { useEffect } from 'react';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

/**
 * Injects BreadcrumbList structured data (JSON-LD) into the document head.
 * This helps search engines understand site hierarchy and display breadcrumbs in SERPs.
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  useEffect(() => {
    if (items.length === 0) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-schema';
    script.textContent = JSON.stringify(schema);

    // Remove existing breadcrumb schema if present
    const existing = document.getElementById('breadcrumb-schema');
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('breadcrumb-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [items]);

  return null;
}

/**
 * Pre-built breadcrumb configurations for common pages
 */
export const BREADCRUMBS = {
  home: [{ name: 'Home', url: 'https://havoptic.com/' }],

  blog: [
    { name: 'Home', url: 'https://havoptic.com/' },
    { name: 'Blog', url: 'https://havoptic.com/#/blog' },
  ],

  compare: [
    { name: 'Home', url: 'https://havoptic.com/' },
    { name: 'Compare Tools', url: 'https://havoptic.com/#/compare' },
  ],

  trends: [
    { name: 'Home', url: 'https://havoptic.com/' },
    { name: 'Trends & Insights', url: 'https://havoptic.com/#/trends' },
  ],
};

/**
 * Generate breadcrumbs for a tool page
 */
export function getToolBreadcrumbs(toolName: string, toolId: string): BreadcrumbItem[] {
  return [
    { name: 'Home', url: 'https://havoptic.com/' },
    { name: 'Tools', url: 'https://havoptic.com/' },
    { name: toolName, url: `https://havoptic.com/#/tools/${toolId}` },
  ];
}

/**
 * Generate breadcrumbs for a blog post
 */
export function getBlogPostBreadcrumbs(postTitle: string, postSlug: string): BreadcrumbItem[] {
  return [
    { name: 'Home', url: 'https://havoptic.com/' },
    { name: 'Blog', url: 'https://havoptic.com/#/blog' },
    { name: postTitle, url: `https://havoptic.com/#/blog/${postSlug}` },
  ];
}

export default BreadcrumbSchema;

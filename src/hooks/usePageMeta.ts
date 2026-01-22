import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
}

const DEFAULT_TITLE = 'Havoptic - AI Tool Releases | Track Claude Code, Cursor, Gemini CLI, Copilot, Aider & Windsurf Updates';
const DEFAULT_DESCRIPTION = 'Stay up-to-date with the latest releases from top AI coding tools. Track version updates, changelogs, and new features from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro, GitHub Copilot CLI, Aider, and Windsurf in one place.';

/**
 * Hook to dynamically update page title and meta description.
 * Restores defaults when component unmounts.
 */
export function usePageMeta({ title, description }: PageMeta): void {
  useEffect(() => {
    // Store original values
    const originalTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const originalDescription = metaDescription?.getAttribute('content') || '';

    // Update title
    document.title = title;

    // Update meta description
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    // Restore on unmount
    return () => {
      document.title = originalTitle || DEFAULT_TITLE;
      if (metaDescription) {
        metaDescription.setAttribute('content', originalDescription || DEFAULT_DESCRIPTION);
      }
    };
  }, [title, description]);
}

/**
 * Pre-defined page meta configurations
 */
export const PAGE_META = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  blog: {
    title: 'Blog | Havoptic - AI Coding Tool Insights',
    description: 'In-depth analysis, comparisons, and insights about AI coding tools including Claude Code, Cursor, Gemini CLI, GitHub Copilot, Aider, and Windsurf.',
  },
  compare: {
    title: 'Compare AI Coding Tools | Havoptic',
    description: 'Side-by-side comparison of AI coding tools: Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, Kiro, GitHub Copilot CLI, Aider, and Windsurf. Compare features, pricing, and capabilities.',
  },
  trends: {
    title: 'Trends & Insights | Havoptic',
    description: 'Analyze release patterns and trends across AI coding tools. View release frequency, version history charts, and development insights for Claude Code, Cursor, Gemini CLI, and more.',
  },
};

export default usePageMeta;

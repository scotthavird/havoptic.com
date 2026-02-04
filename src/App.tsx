import { useEffect, useRef, useState, useMemo } from 'react';
import { Timeline } from './components/Timeline';
import { ToolFilter } from './components/ToolFilter';
import { Layout } from './components/Layout';
import { SignInPrompt } from './components/SignInPrompt';
import { useReleases } from './hooks/useReleases';
import { useWatchlist } from './context/WatchlistContext';
import { TOOL_CONFIG, type ToolId } from './types/release';
import { trackScrollDepth, trackPageView } from './utils/analytics';
import { CompareVs } from './pages/CompareVs';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { Compare } from './pages/Compare';
import { Tool } from './pages/Tool';
import { Trends } from './pages/Trends';
import { ConfirmationResult } from './pages/ConfirmationResult';

type Page =
  | { type: 'home' }
  | { type: 'terms' }
  | { type: 'privacy' }
  | { type: 'blog' }
  | { type: 'blogPost'; slug: string }
  | { type: 'compare' }
  | { type: 'compareVs'; tool1: ToolId; tool2: ToolId }
  | { type: 'trends' }
  | { type: 'tool'; toolId: ToolId }
  | { type: 'confirmed' };

// Parse "tool1-vs-tool2" pattern for comparison pages
function parseCompareVsSlug(slug: string): { tool1: ToolId; tool2: ToolId } | null {
  const match = slug.match(/^([a-z-]+)-vs-([a-z-]+)$/);
  if (!match) return null;

  const tool1 = match[1] as ToolId;
  const tool2 = match[2] as ToolId;

  // Validate both tools exist
  if (!TOOL_CONFIG[tool1] || !TOOL_CONFIG[tool2]) return null;

  return { tool1, tool2 };
}

/** Extract release ID from /r/{releaseId} path */
function getSharedReleaseId(): string | null {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/r/')) {
    return pathname.slice(3);
  }
  return null;
}

function getPageFromLocation(): Page {
  const pathname = window.location.pathname;

  // /r/ paths are handled as home page with a scroll target
  if (pathname.startsWith('/r/')) {
    return { type: 'home' };
  }

  // Path-based routing (primary)
  if (pathname === '/terms') return { type: 'terms' };
  if (pathname === '/privacy') return { type: 'privacy' };
  if (pathname === '/blog') return { type: 'blog' };
  if (pathname === '/compare') return { type: 'compare' };
  if (pathname === '/trends') return { type: 'trends' };
  if (pathname === '/confirmed') return { type: 'confirmed' };
  if (pathname.startsWith('/blog/')) {
    return { type: 'blogPost', slug: pathname.slice(6) };
  }
  if (pathname.startsWith('/tools/')) {
    return { type: 'tool', toolId: pathname.slice(7) as ToolId };
  }
  // Handle /compare/tool1-vs-tool2 pattern
  if (pathname.startsWith('/compare/')) {
    const slug = pathname.slice(9);
    const tools = parseCompareVsSlug(slug);
    if (tools) {
      return { type: 'compareVs', tool1: tools.tool1, tool2: tools.tool2 };
    }
  }

  // Hash-based fallback (backwards compatibility)
  const hash = window.location.hash;
  if (hash === '#/terms') return { type: 'terms' };
  if (hash === '#/privacy') return { type: 'privacy' };
  if (hash === '#/blog') return { type: 'blog' };
  if (hash === '#/compare') return { type: 'compare' };
  if (hash === '#/trends') return { type: 'trends' };
  if (hash.startsWith('#/blog/')) {
    return { type: 'blogPost', slug: hash.slice(7) };
  }
  if (hash.startsWith('#/tools/')) {
    return { type: 'tool', toolId: hash.slice(8) as ToolId };
  }
  // Handle #/compare/tool1-vs-tool2 pattern
  if (hash.startsWith('#/compare/')) {
    const slug = hash.slice(10);
    const tools = parseCompareVsSlug(slug);
    if (tools) {
      return { type: 'compareVs', tool1: tools.tool1, tool2: tools.tool2 };
    }
  }

  return { type: 'home' };
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromLocation);
  const [selectedTool, setSelectedTool] = useState<ToolId | 'all' | 'watching'>('all');
  const [highlightedReleaseId, setHighlightedReleaseId] = useState<string | null>(null);
  const { watchedToolIds } = useWatchlist();

  // When "watching" is selected, fetch all releases and filter client-side
  const apiSelectedTool = selectedTool === 'watching' ? 'all' : selectedTool;
  const { groupedReleases: rawGroupedReleases, loading, error, isLimited, limitedMessage } = useReleases(apiSelectedTool);

  // Filter releases for "watching" filter
  const groupedReleases = useMemo(() => {
    if (selectedTool !== 'watching') return rawGroupedReleases;

    // Filter each month's releases to only include watched tools
    return rawGroupedReleases.map(yearGroup => ({
      ...yearGroup,
      months: yearGroup.months.map(monthGroup => ({
        ...monthGroup,
        releases: monthGroup.releases.filter(release =>
          watchedToolIds.includes(release.tool)
        ),
      })).filter(monthGroup => monthGroup.releases.length > 0),
    })).filter(yearGroup => yearGroup.months.length > 0);
  }, [selectedTool, rawGroupedReleases, watchedToolIds]);

  const scrollMilestones = useRef(new Set<number>());
  const hasScrolledToAnchor = useRef(false);
  const sharedReleaseId = useRef<string | null>(getSharedReleaseId());

  // Handle navigation changes (both path and hash)
  useEffect(() => {
    const handleNavigation = () => {
      const newPage = getPageFromLocation();
      setCurrentPage(newPage);
      // Scroll to top when navigating to a new page
      if (newPage.type !== 'home') {
        window.scrollTo(0, 0);
      }
      // Reset scroll flag and update shared release ID on navigation
      const newSharedReleaseId = getSharedReleaseId();
      if (newSharedReleaseId) {
        sharedReleaseId.current = newSharedReleaseId;
        hasScrolledToAnchor.current = false;
      }
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  // Track SPA page views
  useEffect(() => {
    const pagePath = window.location.pathname;
    let pageTitle = 'Havoptic';

    switch (currentPage.type) {
      case 'home':
        pageTitle = 'AI Tool Releases | Havoptic';
        break;
      case 'blog':
        pageTitle = 'Blog | Havoptic';
        break;
      case 'blogPost':
        pageTitle = `${currentPage.slug} | Havoptic Blog`;
        break;
      case 'compare':
        pageTitle = 'Compare AI Tools | Havoptic';
        break;
      case 'compareVs':
        pageTitle = `${TOOL_CONFIG[currentPage.tool1]?.displayName || currentPage.tool1} vs ${TOOL_CONFIG[currentPage.tool2]?.displayName || currentPage.tool2} | Havoptic`;
        break;
      case 'trends':
        pageTitle = 'AI Tool Trends | Havoptic';
        break;
      case 'tool':
        pageTitle = `${TOOL_CONFIG[currentPage.toolId]?.displayName || currentPage.toolId} Releases | Havoptic`;
        break;
      case 'terms':
        pageTitle = 'Terms of Service | Havoptic';
        break;
      case 'privacy':
        pageTitle = 'Privacy Policy | Havoptic';
        break;
    }

    trackPageView(pagePath, pageTitle);
  }, [currentPage]);

  // Scroll to anchor element after data loads and renders (only on home page)
  useEffect(() => {
    if (currentPage.type !== 'home') return;
    if (!loading && !error && groupedReleases.length > 0 && !hasScrolledToAnchor.current) {
      // Check for shared release link (/r/{releaseId}) first
      const targetId = sharedReleaseId.current || (() => {
        const hash = window.location.hash.slice(1);
        // Only use hash if it's not a route hash
        return hash && !hash.startsWith('/') ? hash : null;
      })();

      if (targetId) {
        // Use double requestAnimationFrame to ensure DOM has been painted after React render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const element = document.getElementById(targetId);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              hasScrolledToAnchor.current = true;

              // Apply highlight effect for shared links
              if (sharedReleaseId.current) {
                setHighlightedReleaseId(targetId);
                // Remove highlight after animation completes
                setTimeout(() => setHighlightedReleaseId(null), 3000);
              }
            }
          });
        });
      }
    }
  }, [loading, error, groupedReleases, currentPage]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
      const milestones = [25, 50, 75, 100];

      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone);
          trackScrollDepth(milestone);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Render pages based on currentPage type
  if (currentPage.type === 'terms') {
    return (
      <Layout>
        <TermsOfService />
      </Layout>
    );
  }

  if (currentPage.type === 'privacy') {
    return (
      <Layout>
        <PrivacyPolicy />
      </Layout>
    );
  }

  if (currentPage.type === 'blog') {
    return (
      <Layout>
        <Blog />
      </Layout>
    );
  }

  if (currentPage.type === 'blogPost') {
    return (
      <Layout>
        <BlogPost slug={currentPage.slug} />
      </Layout>
    );
  }

  if (currentPage.type === 'compare') {
    return (
      <Layout>
        <Compare />
      </Layout>
    );
  }

  if (currentPage.type === 'compareVs') {
    return (
      <Layout>
        <CompareVs tool1={currentPage.tool1} tool2={currentPage.tool2} />
      </Layout>
    );
  }

  if (currentPage.type === 'trends') {
    return (
      <Layout>
        <Trends />
      </Layout>
    );
  }

  if (currentPage.type === 'confirmed') {
    return (
      <Layout>
        <ConfirmationResult />
      </Layout>
    );
  }

  if (currentPage.type === 'tool') {
    return (
      <Layout>
        <Tool toolId={currentPage.toolId} />
      </Layout>
    );
  }

  // Render home page
  return (
    <Layout>
      <main role="main" aria-label="AI Tool Releases Timeline">
        <nav aria-label="Filter by tool">
          <ToolFilter selectedTool={selectedTool} onSelect={setSelectedTool} />
        </nav>

        {loading && (
          <div className="text-center py-12 text-slate-400" aria-live="polite" aria-busy="true">
            Loading releases...
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-400" role="alert">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <Timeline
              key={selectedTool}
              groupedReleases={groupedReleases}
              highlightedReleaseId={highlightedReleaseId}
              selectedTool={selectedTool}
            />
            {isLimited && (
              <SignInPrompt
                message={limitedMessage || undefined}
                className="mt-8"
              />
            )}
          </>
        )}
      </main>
    </Layout>
  );
}

export default App;

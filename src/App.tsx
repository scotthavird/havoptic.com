import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Timeline } from './components/Timeline';
import { ToolFilter } from './components/ToolFilter';
import { Layout } from './components/Layout';
import { NewsletterSignup } from './components/NewsletterSignup';
import { SignInPrompt } from './components/SignInPrompt';
import { useReleases } from './hooks/useReleases';
import { TOOL_CONFIG, type ToolId } from './types/release';
import { trackScrollDepth } from './utils/analytics';
import { CompareVs } from './pages/CompareVs';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { Compare } from './pages/Compare';
import { Tool } from './pages/Tool';
import { Trends } from './pages/Trends';

type Page =
  | { type: 'home' }
  | { type: 'terms' }
  | { type: 'privacy' }
  | { type: 'blog' }
  | { type: 'blogPost'; slug: string }
  | { type: 'compare' }
  | { type: 'compareVs'; tool1: ToolId; tool2: ToolId }
  | { type: 'trends' }
  | { type: 'tool'; toolId: ToolId };

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

function getPageFromLocation(): Page {
  const pathname = window.location.pathname;

  // Path-based routing (primary)
  if (pathname === '/terms') return { type: 'terms' };
  if (pathname === '/privacy') return { type: 'privacy' };
  if (pathname === '/blog') return { type: 'blog' };
  if (pathname === '/compare') return { type: 'compare' };
  if (pathname === '/trends') return { type: 'trends' };
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
  const [selectedTool, setSelectedTool] = useState<ToolId | 'all'>('all');
  const { groupedReleases, lastUpdated, loading, error, isLimited, limitedMessage } = useReleases(selectedTool);
  const scrollMilestones = useRef(new Set<number>());
  const hasScrolledToAnchor = useRef(false);

  // Handle navigation changes (both path and hash)
  useEffect(() => {
    const handleNavigation = () => {
      const newPage = getPageFromLocation();
      setCurrentPage(newPage);
      // Scroll to top when navigating to a new page
      if (newPage.type !== 'home') {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  // Scroll to anchor element after data loads and renders (only on home page)
  useEffect(() => {
    if (currentPage.type !== 'home') return;
    if (!loading && !error && groupedReleases.length > 0 && !hasScrolledToAnchor.current) {
      const hash = window.location.hash.slice(1);
      // Only scroll to anchor if it's not a route hash
      if (hash && !hash.startsWith('/')) {
        // Use double requestAnimationFrame to ensure DOM has been painted after React render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const element = document.getElementById(hash);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              hasScrolledToAnchor.current = true;
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
      <Header lastUpdated={lastUpdated} />
      <main role="main" aria-label="AI Tool Releases Timeline">
        <section aria-label="Newsletter signup" className="mb-6">
          <NewsletterSignup variant="hero" />
        </section>

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
            <Timeline key={selectedTool} groupedReleases={groupedReleases} />
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

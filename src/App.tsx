import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Timeline } from './components/Timeline';
import { ToolFilter } from './components/ToolFilter';
import { Layout } from './components/Layout';
import { NewsletterSignup } from './components/NewsletterSignup';
import { useReleases } from './hooks/useReleases';
import type { ToolId } from './types/release';
import { trackScrollDepth } from './utils/analytics';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { Compare } from './pages/Compare';
import { Tool } from './pages/Tool';

type Page =
  | { type: 'home' }
  | { type: 'terms' }
  | { type: 'privacy' }
  | { type: 'blog' }
  | { type: 'blogPost'; slug: string }
  | { type: 'compare' }
  | { type: 'tool'; toolId: ToolId };

function getPageFromHash(): Page {
  const hash = window.location.hash;
  if (hash === '#/terms') return { type: 'terms' };
  if (hash === '#/privacy') return { type: 'privacy' };
  if (hash === '#/blog') return { type: 'blog' };
  if (hash === '#/compare') return { type: 'compare' };
  if (hash.startsWith('#/blog/')) {
    const slug = hash.slice(7); // Remove '#/blog/'
    return { type: 'blogPost', slug };
  }
  if (hash.startsWith('#/tools/')) {
    const toolId = hash.slice(8) as ToolId; // Remove '#/tools/'
    return { type: 'tool', toolId };
  }
  return { type: 'home' };
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash);
  const [selectedTool, setSelectedTool] = useState<ToolId | 'all'>('all');
  const { groupedReleases, lastUpdated, loading, error } = useReleases(selectedTool);
  const scrollMilestones = useRef(new Set<number>());
  const hasScrolledToAnchor = useRef(false);

  // Handle hash changes for routing
  useEffect(() => {
    const handleHashChange = () => {
      const newPage = getPageFromHash();
      setCurrentPage(newPage);
      // Scroll to top when navigating to a new page
      if (newPage.type !== 'home') {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
          <Timeline key={selectedTool} groupedReleases={groupedReleases} />
        )}
      </main>
    </Layout>
  );
}

export default App;

import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Timeline } from './components/Timeline';
import { ToolFilter } from './components/ToolFilter';
import { Layout } from './components/Layout';
import { useReleases } from './hooks/useReleases';
import type { ToolId } from './types/release';
import { trackScrollDepth } from './utils/analytics';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

type Page = 'home' | 'terms' | 'privacy';

function getPageFromHash(): Page {
  const hash = window.location.hash;
  if (hash === '#/terms') return 'terms';
  if (hash === '#/privacy') return 'privacy';
  return 'home';
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
      if (newPage !== 'home') {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Scroll to anchor element after data loads and renders (only on home page)
  useEffect(() => {
    if (currentPage !== 'home') return;
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

  // Render legal pages
  if (currentPage === 'terms') {
    return (
      <Layout>
        <TermsOfService />
      </Layout>
    );
  }

  if (currentPage === 'privacy') {
    return (
      <Layout>
        <PrivacyPolicy />
      </Layout>
    );
  }

  // Render home page
  return (
    <Layout>
      <Header lastUpdated={lastUpdated} />
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
          <Timeline key={selectedTool} groupedReleases={groupedReleases} />
        )}
      </main>
    </Layout>
  );
}

export default App;

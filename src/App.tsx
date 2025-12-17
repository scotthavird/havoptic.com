import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ToolFilter } from './components/ToolFilter';
import { Timeline } from './components/Timeline';
import { useReleases } from './hooks/useReleases';
import { trackScrollDepth } from './utils/analytics';
import type { ToolId } from './types/release';

function App() {
  const [selectedTool, setSelectedTool] = useState<ToolId | 'all'>('all');
  const { groupedReleases, lastUpdated, loading, error } = useReleases(selectedTool);
  const scrollMilestones = useRef(new Set<number>());

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
    return () => window.removeEventListener('scroll', handleScroll, { passive: true });
  }, []);

  return (
    <div className="min-h-screen">
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
          <Timeline groupedReleases={groupedReleases} />
        )}
      </main>
    </div>
  );
}

export default App;

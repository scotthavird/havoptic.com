import { useState } from 'react';
import { Header } from './components/Header';
import { ToolFilter } from './components/ToolFilter';
import { Timeline } from './components/Timeline';
import { useReleases } from './hooks/useReleases';
import type { ToolId } from './types/release';

function App() {
  const [selectedTool, setSelectedTool] = useState<ToolId | 'all'>('all');
  const { groupedReleases, lastUpdated, loading, error } = useReleases(selectedTool);

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

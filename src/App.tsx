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
      <ToolFilter selectedTool={selectedTool} onSelect={setSelectedTool} />

      {loading && (
        <div className="text-center py-12 text-slate-400">
          Loading releases...
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-red-400">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <Timeline groupedReleases={groupedReleases} />
      )}
    </div>
  );
}

export default App;

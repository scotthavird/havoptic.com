import { TOOL_CONFIG, type ToolId } from '../types/release';
import { trackToolFilterClick } from '../utils/analytics';

interface ToolFilterProps {
  selectedTool: ToolId | 'all';
  onSelect: (tool: ToolId | 'all') => void;
}

export function ToolFilter({ selectedTool, onSelect }: ToolFilterProps) {
  const tools: (ToolId | 'all')[] = ['all', 'claude-code', 'openai-codex', 'cursor'];

  return (
    <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter releases by tool">
      {tools.map((tool) => {
        const isSelected = selectedTool === tool;
        const config = tool === 'all' ? null : TOOL_CONFIG[tool];
        const label = tool === 'all' ? 'All Tools' : config?.displayName;

        return (
          <button
            key={tool}
            onClick={() => {
              trackToolFilterClick(tool);
              onSelect(tool);
            }}
            aria-pressed={isSelected}
            aria-label={`Filter by ${label}`}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all
              ${isSelected
                ? tool === 'all'
                  ? 'bg-white text-slate-900'
                  : `${config?.bgColor} text-white`
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }
            `}
          >
            {tool === 'all' ? 'All' : config?.displayName}
          </button>
        );
      })}
    </div>
  );
}

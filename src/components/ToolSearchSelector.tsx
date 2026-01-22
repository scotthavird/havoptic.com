import { useState, useRef, useEffect } from 'react';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { getAllToolIds } from '../utils/toolRegistry';

interface ToolSearchSelectorProps {
  selectedTools: ToolId[];
  onChange: (tools: ToolId[]) => void;
  maxTools?: number;
}

export function ToolSearchSelector({ selectedTools, onChange, maxTools = 4 }: ToolSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTools = getAllToolIds();

  const filteredTools = allTools.filter((toolId) => {
    const config = TOOL_CONFIG[toolId];
    const query = searchQuery.toLowerCase();
    return (
      config.displayName.toLowerCase().includes(query) ||
      config.shortName.toLowerCase().includes(query) ||
      toolId.includes(query)
    );
  });

  const availableTools = filteredTools.filter((id) => !selectedTools.includes(id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTool = (toolId: ToolId) => {
    if (selectedTools.length < maxTools && !selectedTools.includes(toolId)) {
      onChange([...selectedTools, toolId]);
      setSearchQuery('');
    }
  };

  const handleRemoveTool = (toolId: ToolId) => {
    if (selectedTools.length > 1) {
      onChange(selectedTools.filter((id) => id !== toolId));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tools display */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedTools.map((toolId) => {
          const config = TOOL_CONFIG[toolId];
          return (
            <div
              key={toolId}
              className={`${config.bgColor} text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium`}
            >
              {config.shortName}
              {selectedTools.length > 1 && (
                <button
                  onClick={() => handleRemoveTool(toolId)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${config.displayName}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        {/* Add tool button */}
        {selectedTools.length < maxTools && (
          <button
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="px-3 py-1.5 rounded-lg border-2 border-dashed border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Tool
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {availableTools.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">
                {searchQuery ? 'No matching tools' : 'All tools selected'}
              </div>
            ) : (
              availableTools.map((toolId) => {
                const config = TOOL_CONFIG[toolId];
                return (
                  <button
                    key={toolId}
                    onClick={() => {
                      handleAddTool(toolId);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-colors flex items-center gap-3"
                  >
                    <span className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                    <span className="text-sm text-white">{config.displayName}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 border-t border-slate-700">
            <span className="text-xs text-slate-500">
              {selectedTools.length}/{maxTools} tools selected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

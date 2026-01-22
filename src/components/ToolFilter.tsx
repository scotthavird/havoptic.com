import { useRef, useState, useEffect } from 'react';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { getAllToolIds } from '../utils/toolRegistry';
import { trackToolFilterClick } from '../utils/analytics';

interface ToolFilterProps {
  selectedTool: ToolId | 'all';
  onSelect: (tool: ToolId | 'all') => void;
}

export function ToolFilter({ selectedTool, onSelect }: ToolFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const tools: (ToolId | 'all')[] = ['all', ...getAllToolIds()];

  // Check scroll position for fade indicators
  const updateFadeIndicators = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftFade(scrollLeft > 10);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    updateFadeIndicators();
    window.addEventListener('resize', updateFadeIndicators);
    return () => window.removeEventListener('resize', updateFadeIndicators);
  }, []);

  return (
    <div className="relative mb-6 sm:mb-8">
      {/* Left fade indicator */}
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      )}

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        onScroll={updateFadeIndicators}
        className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1"
        role="group"
        aria-label="Filter releases by tool"
      >
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
                px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                ${isSelected
                  ? tool === 'all'
                    ? 'bg-white text-slate-900'
                    : `${config?.bgColor} text-white`
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }
              `}
            >
              {tool === 'all' ? 'All' : config?.shortName || config?.displayName}
            </button>
          );
        })}
      </div>

      {/* Right fade indicator */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
      )}
    </div>
  );
}

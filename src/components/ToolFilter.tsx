import { useRef, useState, useEffect } from 'react';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { getAllToolIds } from '../utils/toolRegistry';
import { trackToolFilterClick, trackWatchlistFilterClick } from '../utils/analytics';
import { useWatchlist } from '../hooks/useWatchlist';
import { WatchToggle } from './WatchButton';

interface ToolFilterProps {
  selectedTool: ToolId | 'all' | 'watching';
  onSelect: (tool: ToolId | 'all' | 'watching') => void;
}

export function ToolFilter({ selectedTool, onSelect }: ToolFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const { watchCount } = useWatchlist();

  const tools: (ToolId | 'all' | 'watching')[] = ['all', 'watching', ...getAllToolIds()];

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
    <div className="relative mb-3 sm:mb-4">
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
          const config = tool === 'all' || tool === 'watching' ? null : TOOL_CONFIG[tool];
          const label = tool === 'all' ? 'All Tools' : tool === 'watching' ? 'Watching' : config?.displayName;

          // Watching filter button with special styling
          if (tool === 'watching') {
            return (
              <button
                key={tool}
                onClick={() => {
                  trackWatchlistFilterClick();
                  onSelect(tool);
                }}
                aria-pressed={isSelected}
                aria-label={`Filter by ${label}`}
                className={`
                  px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1.5
                  ${isSelected
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                  ${watchCount === 0 ? 'opacity-50' : ''}
                `}
                disabled={watchCount === 0}
                title={watchCount === 0 ? 'Watch some tools to use this filter' : `Show ${watchCount} watched tools`}
              >
                {/* Star icon */}
                <svg
                  className="w-3.5 h-3.5"
                  fill={isSelected ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                  />
                </svg>
                Watching
                {watchCount > 0 && (
                  <span className={`text-xs ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                    ({watchCount})
                  </span>
                )}
              </button>
            );
          }

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
                px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1.5
                ${isSelected
                  ? tool === 'all'
                    ? 'bg-white text-slate-900'
                    : `${config?.bgColor} text-white`
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }
              `}
            >
              {tool === 'all' ? 'All' : config?.shortName || config?.displayName}
              {tool !== 'all' && (
                <WatchToggle toolId={tool} className="ml-0.5" />
              )}
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

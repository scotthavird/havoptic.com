import { useRef, useState, useEffect } from 'react';
import { TOOL_CONFIG, type ToolId } from '../types/release';
import { getAllToolIds } from '../utils/toolRegistry';

interface TrendsToolFilterProps {
  selectedTools: ToolId[];
  onChange: (tools: ToolId[]) => void;
}

export function TrendsToolFilter({ selectedTools, onChange }: TrendsToolFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const allTools = getAllToolIds();
  const allSelected = selectedTools.length === allTools.length;

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

  const handleAllClick = () => {
    onChange(allSelected ? [allTools[0]] : [...allTools]);
  };

  const handleToolClick = (toolId: ToolId) => {
    const isSelected = selectedTools.includes(toolId);
    if (isSelected) {
      // Don't allow deselecting the last tool
      if (selectedTools.length <= 1) return;
      onChange(selectedTools.filter((t) => t !== toolId));
    } else {
      onChange([...selectedTools, toolId]);
    }
  };

  return (
    <div className="relative mb-3 sm:mb-4">
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      )}

      <div
        ref={scrollContainerRef}
        onScroll={updateFadeIndicators}
        className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1"
        role="group"
        aria-label="Filter trends by tool"
      >
        <button
          onClick={handleAllClick}
          aria-pressed={allSelected}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
            allSelected
              ? 'bg-white text-slate-900'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All
        </button>

        {allTools.map((toolId) => {
          const config = TOOL_CONFIG[toolId];
          const isSelected = selectedTools.includes(toolId);
          return (
            <button
              key={toolId}
              onClick={() => handleToolClick(toolId)}
              aria-pressed={isSelected}
              aria-label={`Toggle ${config.displayName}`}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                isSelected
                  ? `${config.bgColor} text-white`
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {config.shortName || config.displayName}
            </button>
          );
        })}
      </div>

      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
      )}
    </div>
  );
}

import { useState } from 'react';
import type { ToolId } from '../types/release';
import { TOOL_CONFIG } from '../types/release';
import { useWatchlist } from '../context/WatchlistContext';

interface WatchButtonProps {
  toolId: ToolId;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Button to toggle watching a tool
 * Shows filled star when watching, outline when not
 */
export function WatchButton({
  toolId,
  size = 'md',
  showLabel = false,
  className = '',
}: WatchButtonProps) {
  const { isWatching, toggleTool, loading } = useWatchlist();
  const [isToggling, setIsToggling] = useState(false);

  const watching = isWatching(toolId);
  const config = TOOL_CONFIG[toolId];

  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-sm',
    lg: 'p-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading || isToggling) return;

    setIsToggling(true);
    try {
      await toggleTool(toolId);
    } finally {
      setIsToggling(false);
    }
  };

  const label = watching ? 'Watching' : 'Watch';
  const tooltip = watching
    ? `Stop watching ${config.displayName}`
    : `Watch ${config.displayName} for updates`;

  return (
    <button
      onClick={handleClick}
      disabled={loading || isToggling}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={watching}
      className={`
        inline-flex items-center gap-1.5 rounded-full transition-all
        ${sizeClasses[size]}
        ${watching
          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }
        ${(loading || isToggling) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* Star icon */}
      <svg
        className={`${iconSizes[size]} ${isToggling ? 'animate-pulse' : ''}`}
        fill={watching ? 'currentColor' : 'none'}
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

      {showLabel && (
        <span className="font-medium">{label}</span>
      )}
    </button>
  );
}

/**
 * Compact watch toggle for use in lists
 */
export function WatchToggle({
  toolId,
  className = '',
}: {
  toolId: ToolId;
  className?: string;
}) {
  return (
    <WatchButton
      toolId={toolId}
      size="sm"
      showLabel={false}
      className={className}
    />
  );
}

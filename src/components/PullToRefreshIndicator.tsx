interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isPulling: boolean;
  isRefreshing: boolean;
}

const CIRCLE_RADIUS = 9;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export function PullToRefreshIndicator({
  pullProgress,
  isPulling,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  const visible = isPulling || isRefreshing;
  const atThreshold = pullProgress >= 1;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-0 right-0 flex justify-center z-30"
      style={{
        top: -32,
        opacity: visible ? Math.min(pullProgress * 2, 1) : 0,
        transition: visible ? 'none' : 'opacity 300ms ease-out',
      }}
    >
      {isRefreshing && (
        <span className="sr-only">Refreshing releases...</span>
      )}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className={isRefreshing ? 'animate-[ptr-spin_2s_linear_infinite]' : ''}
        style={{
          transform: atThreshold && !isRefreshing ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 200ms ease-out',
        }}
      >
        <circle
          cx="12"
          cy="12"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={isRefreshing ? 'text-slate-500' : 'text-slate-400'}
          style={
            isRefreshing
              ? {
                  strokeDasharray: `${CIRCLE_CIRCUMFERENCE * 0.25} ${CIRCLE_CIRCUMFERENCE * 0.75}`,
                }
              : {
                  strokeDasharray: `${CIRCLE_CIRCUMFERENCE * pullProgress} ${CIRCLE_CIRCUMFERENCE * (1 - pullProgress)}`,
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                }
          }
        />
      </svg>
    </div>
  );
}

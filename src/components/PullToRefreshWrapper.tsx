import type { ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

interface PullToRefreshWrapperProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export function PullToRefreshWrapper({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshWrapperProps) {
  const { pullDistance, isPulling, isRefreshing, pullProgress } =
    usePullToRefresh({ onRefresh, disabled });

  const isActive = isPulling || isRefreshing;

  return (
    <div className="relative">
      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isPulling={isPulling}
        isRefreshing={isRefreshing}
      />
      <div
        style={{
          transform: isActive ? `translateY(${pullDistance}px)` : 'none',
          transition: isPulling
            ? 'none'
            : 'transform 400ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

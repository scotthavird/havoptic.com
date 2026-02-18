import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  pullProgress: number;
}

const RESISTANCE = 0.4;

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 100,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const pulling = useRef(false);
  const directionLocked = useRef(false);
  const isHorizontal = useRef(false);

  const handleStart = useCallback((clientY: number, clientX: number) => {
    if (disabled || isRefreshing) return;
    if (window.scrollY > 0) return;
    startY.current = clientY;
    startX.current = clientX;
    directionLocked.current = false;
    isHorizontal.current = false;
  }, [disabled, isRefreshing]);

  const handleMove = useCallback((clientY: number, clientX: number, e?: Event) => {
    if (disabled || isRefreshing) return;
    if (window.scrollY > 0 && !pulling.current) return;

    const deltaY = clientY - startY.current;
    const deltaX = Math.abs(clientX - startX.current);

    // Lock direction after initial movement
    if (!directionLocked.current && (Math.abs(deltaY) > 5 || deltaX > 5)) {
      directionLocked.current = true;
      isHorizontal.current = deltaX > Math.abs(deltaY);
    }

    if (isHorizontal.current) return;
    if (deltaY <= 0) return;

    // Prevent Chrome's native pull-to-refresh
    if (e && window.scrollY <= 0) {
      e.preventDefault();
    }

    if (!pulling.current) {
      pulling.current = true;
      setIsPulling(true);
      document.documentElement.classList.add('ptr-active');
    }

    const distance = Math.min(deltaY * RESISTANCE, maxPull);
    setPullDistance(distance);
  }, [disabled, isRefreshing, maxPull]);

  const handleEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    document.documentElement.classList.remove('ptr-active');

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Hold at threshold during refresh
      setIsPulling(false);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (disabled) return;

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      handleStart(e.touches[0].clientY, e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      handleMove(e.touches[0].clientY, e.touches[0].clientX, e);
    };
    const onTouchEnd = () => handleEnd();

    // Mouse events
    let mouseDown = false;
    const onMouseDown = (e: MouseEvent) => {
      mouseDown = true;
      handleStart(e.clientY, e.clientX);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDown) return;
      handleMove(e.clientY, e.clientX);
    };
    const onMouseUp = () => {
      if (!mouseDown) return;
      mouseDown = false;
      handleEnd();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.documentElement.classList.remove('ptr-active');
    };
  }, [disabled, handleStart, handleMove, handleEnd]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return { pullDistance, isPulling, isRefreshing, pullProgress };
}

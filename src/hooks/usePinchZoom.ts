import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  zoomStep?: number;
}

interface UsePinchZoomReturn {
  scale: number;
  position: Position;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onWheel: (e: React.WheelEvent) => void;
  };
  resetZoom: () => void;
  isZoomed: boolean;
}

export function usePinchZoom(options: UsePinchZoomOptions = {}): UsePinchZoomReturn {
  const { minScale = 1, maxScale = 4, zoomStep = 0.3 } = options;

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  // Refs for tracking gesture state
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const lastPosition = useRef<Position>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });

  const clampScale = useCallback(
    (newScale: number) => Math.min(Math.max(newScale, minScale), maxScale),
    [minScale, maxScale]
  );

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    initialDistance.current = null;
    initialScale.current = 1;
    lastPosition.current = { x: 0, y: 0 };
  }, []);

  // Calculate distance between two touch points
  const getDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Start pinch zoom
      initialDistance.current = getDistance(e.touches);
      initialScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      // Start pan (only when zoomed in)
      isDragging.current = true;
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  }, [scale, position]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      // Pinch zoom
      const currentDistance = getDistance(e.touches);
      const scaleFactor = currentDistance / initialDistance.current;
      const newScale = clampScale(initialScale.current * scaleFactor);
      setScale(newScale);

      // If zooming out to 1x, reset position
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging.current && scale > 1) {
      // Pan
      const newX = e.touches[0].clientX - dragStart.current.x;
      const newY = e.touches[0].clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [clampScale, scale]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialDistance.current = null;
    }
    if (e.touches.length === 0) {
      isDragging.current = false;
      lastPosition.current = position;
    }
  }, [position]);

  // Mouse handlers for desktop
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  }, [scale, position]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current && scale > 1) {
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [scale]);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    lastPosition.current = position;
  }, [position]);

  // Scroll wheel zoom for desktop
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newScale = clampScale(scale + delta);
    setScale(newScale);

    // Reset position when zooming out to 1x
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale, zoomStep, clampScale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetZoom();
    };
  }, [resetZoom]);

  return {
    scale,
    position,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel,
    },
    resetZoom,
    isZoomed: scale > 1,
  };
}

import { useEffect, useCallback, useRef } from 'react';
import { usePinchZoom } from '../hooks/usePinchZoom';

interface ImageZoomModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageZoomModal({ src, alt, isOpen, onClose }: ImageZoomModalProps) {
  const { scale, position, handlers, resetZoom, isZoomed } = usePinchZoom({
    minScale: 1,
    maxScale: 4,
    zoomStep: 0.3,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapTime = useRef<number>(0);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Reset zoom when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetZoom();
    }
  }, [isOpen, resetZoom]);

  // Handle backdrop click (close only if not zoomed and not dragging)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Only close if clicking the backdrop, not the image
      if (e.target === containerRef.current && !isZoomed) {
        onClose();
      }
    },
    [isZoomed, onClose]
  );

  // Double-tap detection for mobile zoom toggle
  const handleDoubleTap = useCallback(
    (e: React.TouchEvent) => {
      const now = Date.now();
      const timeDiff = now - lastTapTime.current;

      if (timeDiff < 300 && timeDiff > 0) {
        // Double tap detected - toggle zoom
        e.preventDefault();
        if (isZoomed) {
          resetZoom();
        }
        // Note: zoom in on double-tap is handled by the image itself expanding
      }
      lastTapTime.current = now;
    },
    [isZoomed, resetZoom]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Zoomed view of ${alt}`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close image viewer"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Zoom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/60 text-xs sm:text-sm text-center pointer-events-none">
        {isZoomed ? 'Pinch or scroll to zoom, drag to pan' : 'Pinch or scroll to zoom in'}
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'contain',
        }}
        onClick={handleBackdropClick}
        onTouchEnd={(e) => {
          handlers.onTouchEnd(e);
          // Handle tap to close when not zoomed (single tap on backdrop area)
          if (!isZoomed && e.target === containerRef.current) {
            handleDoubleTap(e);
          }
        }}
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onMouseUp}
        onMouseLeave={handlers.onMouseUp}
        onWheel={handlers.onWheel}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: scale === 1 ? 'transform 0.2s ease-out' : 'none',
            willChange: 'transform',
          }}
          draggable={false}
          onTouchEnd={handleDoubleTap}
        />
      </div>
    </div>
  );
}

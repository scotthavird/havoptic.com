import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
  timeout?: number;
}

export function LazyImage({ src, alt, className, onError, timeout = 8000 }: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before entering viewport
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Timeout for slow-loading images
  useEffect(() => {
    if (isVisible && !isLoaded && !hasError) {
      timeoutRef.current = window.setTimeout(() => {
        setHasError(true);
        onError?.();
      }, timeout);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, isLoaded, hasError, timeout, onError]);

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoaded(true);
  };

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHasError(true);
    onError?.();
  };

  // Let parent show fallback when image fails
  if (hasError) {
    return null;
  }

  return (
    <div ref={imgRef} className="relative">
      {/* Placeholder with aspect ratio to prevent layout shift */}
      {!isLoaded && (
        <div className="bg-slate-700/50 animate-pulse aspect-square" />
      )}
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: isLoaded ? 'block' : 'none' }}
        />
      )}
    </div>
  );
}

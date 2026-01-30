import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className }: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

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
          onLoad={() => setIsLoaded(true)}
          style={{ display: isLoaded ? 'block' : 'none' }}
        />
      )}
    </div>
  );
}

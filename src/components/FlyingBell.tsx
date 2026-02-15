import { useEffect, useState, useRef, useCallback } from 'react';
import { useNewsletterBell } from '../context/NewsletterBellContext';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

export function FlyingBell() {
  const { animationState, onAnimationComplete } = useNewsletterBell();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [phase, setPhase] = useState<'flying' | 'landing' | 'done'>('flying');
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const sparkleIdRef = useRef(0);
  const sparkleBufferRef = useRef<Sparkle[]>([]);
  const lastSparkleFlushRef = useRef<number>(0);

  const flushSparkles = useCallback(() => {
    if (sparkleBufferRef.current.length > 0) {
      const newSparkles = [...sparkleBufferRef.current];
      sparkleBufferRef.current = [];
      setSparkles(prev => {
        // Keep only sparkles younger than 800ms, plus new ones
        const now = performance.now();
        const cutoff = now - 800;
        const filtered = prev.filter(s => s.id > cutoff - 1000);
        return [...filtered, ...newSparkles];
      });
    }
  }, []);

  useEffect(() => {
    if (!animationState.isAnimating || !animationState.startPosition || !animationState.endPosition) {
      return;
    }

    const start = animationState.startPosition;
    const end = animationState.endPosition;
    const duration = 1200;

    // Calculate control points relative to the distance between start and end
    // so the arc scales properly on mobile and desktop
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const arcHeight = Math.min(dist * 0.4, 150);

    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - arcHeight;

    // Scale control point offsets relative to the flight distance
    const scale = Math.min(dist / 400, 1);
    const cp1 = { x: start.x + 50 * scale, y: start.y - arcHeight * 0.6 };
    const cp2 = { x: midX - 80 * scale, y: midY - 30 * scale };
    const cp3 = { x: midX + 80 * scale, y: midY };
    const cp4 = { x: end.x - 50 * scale, y: end.y - 60 * scale };

    // Scale wobble amplitude based on viewport width
    const wobbleScale = Math.min(window.innerWidth / 768, 1);

    setPosition(start);
    setPhase('flying');
    setSparkles([]);
    sparkleBufferRef.current = [];
    startTimeRef.current = performance.now();
    lastSparkleFlushRef.current = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: ease-out for magical deceleration at the end
      const eased = 1 - Math.pow(1 - progress, 3);

      // Multi-segment bezier for complex path
      let x: number, y: number;

      if (progress < 0.5) {
        const t = progress * 2;
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        x = mt3 * start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * midX;
        y = mt3 * start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * midY;
      } else {
        const t = (progress - 0.5) * 2;
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        x = mt3 * midX + 3 * mt2 * t * cp3.x + 3 * mt * t2 * cp4.x + t3 * end.x;
        y = mt3 * midY + 3 * mt2 * t * cp3.y + 3 * mt * t2 * cp4.y + t3 * end.y;
      }

      // Wobble scales down on mobile and fades out toward the end
      const wobbleX = Math.sin(progress * Math.PI * 6) * (1 - eased) * 8 * wobbleScale;
      const wobbleY = Math.cos(progress * Math.PI * 4) * (1 - eased) * 5 * wobbleScale;

      // Clamp position to viewport bounds
      const finalX = Math.max(16, Math.min(window.innerWidth - 16, x + wobbleX));
      const finalY = Math.max(16, Math.min(window.innerHeight - 16, y + wobbleY));

      setPosition({ x: finalX, y: finalY });

      // Buffer sparkles and flush every ~60ms (instead of every frame)
      if (Math.random() < 0.4) {
        const spread = 20 * wobbleScale;
        sparkleBufferRef.current.push({
          id: sparkleIdRef.current++,
          x: finalX + (Math.random() - 0.5) * spread,
          y: finalY + (Math.random() - 0.5) * spread,
          size: Math.random() * 6 + 3,
          opacity: Math.random() * 0.5 + 0.5,
          delay: Math.random() * 0.15,
        });
      }

      // Flush sparkle buffer every ~60ms to batch DOM updates
      if (elapsed - lastSparkleFlushRef.current > 60) {
        lastSparkleFlushRef.current = elapsed;
        flushSparkles();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Final sparkle flush
        flushSparkles();
        // Landing phase - bouncy effect
        setPhase('landing');
        setTimeout(() => {
          setPhase('done');
          setSparkles([]);
          onAnimationComplete();
        }, 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animationState, onAnimationComplete, flushSparkles]);

  // Clean up old sparkles periodically during animation
  useEffect(() => {
    if (phase !== 'flying' || sparkles.length === 0) return;
    const timer = setTimeout(() => {
      setSparkles(prev => prev.slice(-15)); // Keep only the 15 most recent
    }, 800);
    return () => clearTimeout(timer);
  }, [sparkles.length, phase]);

  if (!animationState.isAnimating || phase === 'done') {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Sparkle trail */}
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          className="absolute animate-sparkle-fade"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
            opacity: sparkle.opacity,
            animationDelay: `${sparkle.delay}s`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z"
              fill="#FFD700"
              className="animate-sparkle-twinkle"
            />
          </svg>
        </div>
      ))}

      {/* Flying bell */}
      <div
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
          phase === 'landing' ? 'animate-bell-land' : 'animate-bell-fly'
        }`}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl scale-150 animate-pulse" />

        {/* Bell icon with golden color */}
        <div className="relative">
          <svg
            className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          </svg>

          {/* Fairy dust particles around the bell */}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
          <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping animation-delay-150" />
          <div className="absolute top-0 -left-2 w-1 h-1 bg-yellow-200 rounded-full animate-ping animation-delay-300" />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
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

  useEffect(() => {
    if (!animationState.isAnimating || !animationState.startPosition || !animationState.endPosition) {
      return;
    }

    const start = animationState.startPosition;
    const end = animationState.endPosition;
    const duration = 1200; // 1.2 seconds for the flight

    // Calculate control points for a magical curved path
    // Like Tinker Bell flying in an arc with a loop
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 150; // Arc above both points

    // Control points for cubic bezier - creates a fairy-like swooping motion
    const cp1 = { x: start.x + 50, y: start.y - 100 };
    const cp2 = { x: midX - 80, y: midY - 50 };
    const cp3 = { x: midX + 80, y: midY };
    const cp4 = { x: end.x - 50, y: end.y - 80 };

    setPosition(start);
    setPhase('flying');
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: ease-out for magical deceleration at the end
      const eased = 1 - Math.pow(1 - progress, 3);

      // Multi-segment bezier for complex path
      let x: number, y: number;

      if (progress < 0.5) {
        // First half: start to midpoint with upward arc
        const t = progress * 2;
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        x = mt3 * start.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * midX;
        y = mt3 * start.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * midY;
      } else {
        // Second half: midpoint to end with graceful descent
        const t = (progress - 0.5) * 2;
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        x = mt3 * midX + 3 * mt2 * t * cp3.x + 3 * mt * t2 * cp4.x + t3 * end.x;
        y = mt3 * midY + 3 * mt2 * t * cp3.y + 3 * mt * t2 * cp4.y + t3 * end.y;
      }

      // Add subtle wobble for fairy-like movement
      const wobbleX = Math.sin(progress * Math.PI * 6) * (1 - eased) * 8;
      const wobbleY = Math.cos(progress * Math.PI * 4) * (1 - eased) * 5;

      setPosition({ x: x + wobbleX, y: y + wobbleY });

      // Generate sparkles along the path
      if (Math.random() < 0.4) {
        const newSparkle: Sparkle = {
          id: sparkleIdRef.current++,
          x: x + wobbleX + (Math.random() - 0.5) * 30,
          y: y + wobbleY + (Math.random() - 0.5) * 30,
          size: Math.random() * 8 + 4,
          opacity: Math.random() * 0.5 + 0.5,
          delay: Math.random() * 0.2,
        };
        setSparkles(prev => [...prev, newSparkle]);

        // Remove old sparkles
        setTimeout(() => {
          setSparkles(prev => prev.filter(s => s.id !== newSparkle.id));
        }, 800);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Landing phase - bouncy effect
        setPhase('landing');
        setTimeout(() => {
          setPhase('done');
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
  }, [animationState, onAnimationComplete]);

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

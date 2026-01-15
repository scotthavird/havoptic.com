import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BellAnimationState {
  isAnimating: boolean;
  startPosition: { x: number; y: number } | null;
  endPosition: { x: number; y: number } | null;
}

interface NewsletterBellContextValue {
  showBellInHeader: boolean;
  animationState: BellAnimationState;
  triggerFlyAnimation: (startPos: { x: number; y: number }) => void;
  setHeaderBellRef: (ref: HTMLElement | null) => void;
  onAnimationComplete: () => void;
}

const NewsletterBellContext = createContext<NewsletterBellContextValue | null>(null);

const BELL_SHOWN_KEY = 'havoptic_bell_shown';

function getBellShown(): boolean {
  try {
    return localStorage.getItem(BELL_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

function setBellShown(): void {
  try {
    localStorage.setItem(BELL_SHOWN_KEY, 'true');
  } catch {
    // localStorage not available
  }
}

export function NewsletterBellProvider({ children }: { children: ReactNode }) {
  const [showBellInHeader, setShowBellInHeader] = useState(getBellShown);
  const [headerBellRef, setHeaderBellRefState] = useState<HTMLElement | null>(null);
  const [animationState, setAnimationState] = useState<BellAnimationState>({
    isAnimating: false,
    startPosition: null,
    endPosition: null,
  });

  const setHeaderBellRef = useCallback((ref: HTMLElement | null) => {
    setHeaderBellRefState(ref);
  }, []);

  const triggerFlyAnimation = useCallback((startPos: { x: number; y: number }) => {
    // Get the header bell target position
    if (headerBellRef) {
      const rect = headerBellRef.getBoundingClientRect();
      const endPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      setAnimationState({
        isAnimating: true,
        startPosition: startPos,
        endPosition: endPos,
      });
    } else {
      // Fallback: estimate header position (top right area)
      setAnimationState({
        isAnimating: true,
        startPosition: startPos,
        endPosition: { x: window.innerWidth - 200, y: 50 },
      });
    }
  }, [headerBellRef]);

  const onAnimationComplete = useCallback(() => {
    setAnimationState({
      isAnimating: false,
      startPosition: null,
      endPosition: null,
    });
    setShowBellInHeader(true);
    setBellShown();
  }, []);

  return (
    <NewsletterBellContext.Provider
      value={{
        showBellInHeader,
        animationState,
        triggerFlyAnimation,
        setHeaderBellRef,
        onAnimationComplete,
      }}
    >
      {children}
    </NewsletterBellContext.Provider>
  );
}

export function useNewsletterBell() {
  const context = useContext(NewsletterBellContext);
  if (!context) {
    throw new Error('useNewsletterBell must be used within NewsletterBellProvider');
  }
  return context;
}

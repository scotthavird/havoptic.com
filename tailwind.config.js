/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'claude': '#D97706',
        'codex': '#059669',
        'cursor': '#7C3AED',
        'gemini': '#00ACC1',
        'kiro': '#8B5CF6',
        'copilot': '#8534F3',
      },
      animation: {
        'sparkle-fade': 'sparkleFade 0.8s ease-out forwards',
        'sparkle-twinkle': 'sparkleTwinkle 0.4s ease-in-out infinite',
        'bell-fly': 'bellFly 0.1s ease-out forwards',
        'bell-land': 'bellLand 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'bell-pulse': 'bellPulse 2s ease-in-out infinite',
        'bell-ring': 'bellRing 0.5s ease-in-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        sparkleFade: {
          '0%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(0) rotate(180deg)', opacity: '0' },
        },
        sparkleTwinkle: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.8' },
        },
        bellFly: {
          '0%, 100%': { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)' },
          '25%': { transform: 'translate(-50%, -50%) rotate(-15deg) scale(1.1)' },
          '75%': { transform: 'translate(-50%, -50%) rotate(15deg) scale(1.1)' },
        },
        bellLand: {
          '0%': { transform: 'translate(-50%, -50%) scale(1.2)' },
          '30%': { transform: 'translate(-50%, -50%) scale(0.8)' },
          '50%': { transform: 'translate(-50%, -50%) scale(1.1)' },
          '70%': { transform: 'translate(-50%, -50%) scale(0.95)' },
          '100%': { transform: 'translate(-50%, -50%) scale(1)' },
        },
        bellPulse: {
          '0%, 100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.4))' },
          '50%': { transform: 'scale(1.05)', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' },
        },
        bellRing: {
          '0%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(15deg)' },
          '30%': { transform: 'rotate(-15deg)' },
          '45%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(-10deg)' },
          '75%': { transform: 'rotate(5deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}

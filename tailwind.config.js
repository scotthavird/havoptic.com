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
      },
    },
  },
  plugins: [],
}

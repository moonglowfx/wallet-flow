/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0F0F13',
        glass: {
          surface: 'rgba(255, 255, 255, 0.04)',
          highlight: 'rgba(255, 255, 255, 0.08)',
          purple: 'rgba(139, 92, 246, 0.14)',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        'liquid': '0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)',
        'liquid-purple': '0 20px 50px rgba(88, 28, 135, 0.35), inset 0 1px 0 0 rgba(216, 180, 254, 0.25)',
        'neon-purple': '0 0 25px rgba(168, 85, 247, 0.45)',
      }
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'overlay-pop': 'overlayPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'overlay-pulse': 'overlayPulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config


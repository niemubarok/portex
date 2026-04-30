import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#ffffff',
        border: '#1f1f1f',
        accent: {
          DEFAULT: '#BC2618',
          hover: '#d42b1b',
        },
        muted: {
          DEFAULT: '#111111',
          foreground: '#a0a0a0',
        },
        card: {
          DEFAULT: '#0a0a0a',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ff4d4d',
          foreground: '#ffffff',
        },
        success: '#00b894',
        warning: '#fbbf24',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config

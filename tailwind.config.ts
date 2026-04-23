import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0B0B1E',
          2: '#12122E',
        },
        card: {
          DEFAULT: '#1A1A3A',
          2: '#23234A',
        },
        border: {
          DEFAULT: '#2A2A55',
        },
        muted: '#8B8BB5',
        brand: {
          pink: '#FF3366',
          pink2: '#FF0844',
          green: '#00E676',
          yellow: '#FFD700',
          blue: '#3D5AFE',
          purple: '#7C4DFF',
          danger: '#FF1744',
        },
      },
      fontFamily: {
        cairo: ['var(--font-cairo)', 'sans-serif'],
        tajawal: ['var(--font-tajawal)', 'sans-serif'],
        mono: ['var(--font-grotesk)', 'monospace'],
      },
      boxShadow: {
        glow: '0 20px 60px rgba(0,0,0,.45)',
        'pink-glow': '0 8px 22px rgba(255,51,102,.4)',
        'green-glow': '0 8px 22px rgba(0,230,118,.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease',
        'pop-in': 'popIn 0.4s ease',
        'slide-in': 'slideIn 0.4s ease',
        'pulse-ring': 'pulseRing 1s infinite',
        'gradient-shift': 'gradientShift 4s ease infinite',
        'blink': 'blink 0.5s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.6)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pulseRing: {
          '0%,100%': { filter: 'drop-shadow(0 0 0 rgba(255,51,102,0))' },
          '50%': { filter: 'drop-shadow(0 0 14px rgba(255,51,102,.9))' },
        },
        gradientShift: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};
export default config;

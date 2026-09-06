/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // TMT OFFICIAL Design System
        abyss: {
          black: '#030307',
          charcoal: '#0A0A12',
          navy: '#0D0D1A',
        },
        neon: {
          cyan: '#00FFFF',
          violet: '#BC13FE',
          gold: '#FFD700',
        },
        ghost: {
          white: '#F0F0F5',
          gray: '#888899',
        },
        glass: {
          white: 'rgba(255,255,255,0.08)',
          border: 'rgba(0,255,255,0.15)',
          violet: 'rgba(188,19,254,0.15)',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '4xs': '2px',
        '3xs': '4px',
        '2xs': '6px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
        '5xl': '128px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 255, 255, 0.3)',
        'glow-violet': '0 0 20px rgba(188, 19, 254, 0.3)',
        'glow-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'depth-1': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'depth-2': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'depth-3': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(0, 255, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(ellipse at center, rgba(0,255,255,0.1) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
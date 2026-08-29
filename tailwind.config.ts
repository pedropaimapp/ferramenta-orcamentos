import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial do guia de marca (Centro Automotivo Porto).
        porto: {
          blue: '#00A1FC',
          blueDark: '#0046C0',
          black: '#0B0D10',
          yellow: '#E1E640',
          offwhite: '#EFF4EF',
          gray: '#748A96',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
      keyframes: {
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'spin-slow': 'spin-slow 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;

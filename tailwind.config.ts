import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#fdfcf0',
        solarpunk: {
          emerald: {
            600: '#059669',
            700: '#047857',
          },
        },
      },
      boxShadow: {
        solarpunk: '0 18px 45px rgba(16, 185, 129, 0.28)',
      },
    },
  },
  plugins: [],
};

export default config;


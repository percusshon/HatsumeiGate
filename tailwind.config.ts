import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1c2f4b',
          light: '#f3f7ff'
        }
      }
    }
  },
  plugins: []
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tap: {
          orange: '#ff6b00',
          'orange-light': '#ff8533',
        },
        surface: {
          0: '#0d0d0f',
          1: '#16161a',
          2: '#1e1e24',
          3: '#2a2a32',
        },
        border: '#2e2e38',
        text: {
          primary: '#f0f0f5',
          secondary: '#a0a0b0',
          muted: '#6b6b7b',
        },
      },
    },
  },
  plugins: [],
};

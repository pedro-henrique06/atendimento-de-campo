/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#0b1220',
          panel: '#111a2b',
          border: '#22314a',
          teal: '#2f7d6e',
          tealLight: '#3fae97',
        },
        risco: {
          vermelho: '#e5484d',
          amarelo: '#e8a13a',
          verde: '#3fae5c',
          preto: '#8a8f98',
        },
      },
    },
  },
  plugins: [],
};

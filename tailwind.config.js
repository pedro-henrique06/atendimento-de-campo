/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-tema="escuro"]'],
  theme: {
    extend: {
      colors: {
        // Cores vindas das telas de referencia, expostas como variaveis CSS
        // para que o mesmo utilitario Tailwind sirva os dois temas.
        fundo: 'rgb(var(--cor-fundo) / <alpha-value>)',
        superficie: 'rgb(var(--cor-superficie) / <alpha-value>)',
        'superficie-2': 'rgb(var(--cor-superficie-2) / <alpha-value>)',
        borda: 'rgb(var(--cor-borda) / <alpha-value>)',
        texto: 'rgb(var(--cor-texto) / <alpha-value>)',
        'texto-suave': 'rgb(var(--cor-texto-suave) / <alpha-value>)',
        marca: 'rgb(var(--cor-marca) / <alpha-value>)',
        'marca-clara': 'rgb(var(--cor-marca-clara) / <alpha-value>)',
        'marca-escura': 'rgb(var(--cor-marca-escura) / <alpha-value>)',
        // Classificacao de risco START.
        vermelho: '#e5484d',
        amarelo: '#f5a524',
        verde: '#46a758',
        preto: '#4b5563',
      },
      borderRadius: {
        card: '1rem',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

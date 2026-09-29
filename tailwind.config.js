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
        'marca-suave': 'rgb(var(--cor-marca-suave) / <alpha-value>)',

        /*
          Classificacao de risco START.

          Eram tres literais fixas, que serviam ao ponto colorido e a mais nada:
          como fundo elas nao davam contraste para texto, e no tema escuro
          ficavam berrantes. Agora cada risco tem a cor cheia (o ponto, a
          barra), a tinta (o texto) e o fundo, e os tres seguem o tema.
        */
        vermelho: 'rgb(var(--cor-risco-vermelho) / <alpha-value>)',
        amarelo: 'rgb(var(--cor-risco-amarelo) / <alpha-value>)',
        verde: 'rgb(var(--cor-risco-verde) / <alpha-value>)',
        preto: 'rgb(var(--cor-risco-preto) / <alpha-value>)',

        'tinta-vermelho': 'rgb(var(--tinta-risco-vermelho) / <alpha-value>)',
        'tinta-amarelo': 'rgb(var(--tinta-risco-amarelo) / <alpha-value>)',
        'tinta-verde': 'rgb(var(--tinta-risco-verde) / <alpha-value>)',
        'tinta-preto': 'rgb(var(--tinta-risco-preto) / <alpha-value>)',

        'fundo-vermelho': 'rgb(var(--fundo-risco-vermelho) / <alpha-value>)',
        'fundo-amarelo': 'rgb(var(--fundo-risco-amarelo) / <alpha-value>)',
        'fundo-verde': 'rgb(var(--fundo-risco-verde) / <alpha-value>)',
        'fundo-preto': 'rgb(var(--fundo-risco-preto) / <alpha-value>)',
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

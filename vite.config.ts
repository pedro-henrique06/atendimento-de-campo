import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'Atendimento de Campo',
        short_name: 'Atendimento',
        description: 'Prontuário de campo: triagem, consulta, odontologia e enfermagem.',
        start_url: '/atendimentos',
        scope: '/',
        display: 'standalone',
        // Em campo o celular vai para o bolso e volta de qualquer jeito; travar
        // em retrato evita a tela girar no meio de um atendimento.
        orientation: 'portrait',
        background_color: '#f3f6fa',
        theme_color: '#143771',
        lang: 'pt-BR',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icone-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /*
          Só o app em si vai para o cache: HTML, JS, CSS e as artes da marca.
          Assim a tela abre sem sinal, que é o ganho real em campo.

          **Nenhuma resposta da API é cacheada, de propósito.** Servir prontuário
          guardado seria mostrar alergia, medicação e classificação de risco
          possivelmente desatualizadas, sem a pessoa saber que está olhando algo
          velho. Numa tela clínica isso é pior que não abrir.
        */
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Desligado: em `npm run dev` um service worker só serviria para
        // entregar código velho enquanto se edita.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5080', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/teste/setup.ts',
  },
});

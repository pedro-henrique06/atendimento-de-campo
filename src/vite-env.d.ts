/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /**
   * URL da API em producao. Vazia em desenvolvimento, onde o proxy do Vite
   * encaminha /api para o backend local.
   */
  readonly VITE_API_URL?: string;

  /**
   * Logotipo da instituicao que opera a base. Caminho servido pelo proprio
   * app (`/logo.png`, arquivo em `public/`) ou URL completa. Vazio usa a
   * marca propria do aplicativo.
   */
  readonly VITE_LOGO_URL?: string;

  /** Nome da instituicao, exibido ao lado do logotipo. */
  readonly VITE_INSTITUICAO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

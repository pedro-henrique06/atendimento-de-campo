/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * URL da API em producao. Vazia em desenvolvimento, onde o proxy do Vite
   * encaminha /api para o backend local.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

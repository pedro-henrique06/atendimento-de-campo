import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

/*
  O idioma inicial segue o aparelho quando não há escolha guardada, e o jsdom
  se apresenta como en-US. Fixar PT deixa as asserções de texto determinísticas
  sem depender do ambiente onde a suíte roda.
*/
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
});

/*
  A suíte não vai à rede.

  Ela já não devia ir, mas nada garantia isso: quem não é mockado caía no
  `fetch` do jsdom. Com uma URL relativa isso falha na hora e ninguém percebe;
  com `VITE_API_URL` apontando para uma API local — o arquivo `.env.local` que
  qualquer um cria para rodar o app contra o próprio servidor, e que o Vitest lê
  igual — a chamada sai de verdade, demora mais do que o `findBy` espera, e
  testes que nada têm a ver com ela começam a falhar por tempo esgotado.

  Foi o que aconteceu: `ProvedorSessao` revalida a base guardada com
  `api.bases()` ao montar, nenhum teste mockava essa chamada, e a suíte passava
  só porque a máquina de quem a rodava não tinha `.env.local`.

  Rejeitar é o mesmo que o jsdom já fazia sem `.env.local`, só que deliberado e
  imediato: o cliente traduz a rejeição em `ErroDeRede`, e quem depende de uma
  resposta precisa mocká-la.
*/
beforeEach(() => {
  globalThis.fetch = ((entrada: RequestInfo | URL) =>
    Promise.reject(
      new Error(`A suíte não vai à rede. Mocke esta chamada: ${String(entrada)}`),
    )) as typeof fetch;
});

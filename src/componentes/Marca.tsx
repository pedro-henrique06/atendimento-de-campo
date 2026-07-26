import { useState } from 'react';
import logoPadrao from '../ativos/logo-instituicao.png';
import simboloPadrao from '../ativos/simbolo-instituicao.png';

/** Nome da instituição que opera as bases. */
export const INSTITUICAO_PADRAO = 'Hospital Israelita Albert Einstein';

/**
 * Marca institucional do aplicativo.
 *
 * A marca vem empacotada com o app, não de uma URL externa: em campo a rede
 * cai, e o logotipo precisa continuar aparecendo. `VITE_LOGO_URL` e
 * `VITE_INSTITUICAO` trocam a marca sem tocar no código, para quando a mesma
 * build servir uma operação de outra instituição.
 *
 * São duas artes, não uma reduzida. O lockup é empilhado — símbolo em cima,
 * nome embaixo — e no cabeçalho do celular o nome sairia com poucos pixels de
 * altura, ilegível. Ali entra só o símbolo; o lockup inteiro fica nas telas
 * abertas, onde há largura para ele ser lido.
 *
 * `contexto` diz onde a marca está: no cartão das telas abertas, cuja
 * superfície acompanha o tema, ou na barra azul do cabeçalho.
 */
export function Marca({ contexto = 'cartao' }: { contexto?: 'cartao' | 'cabecalho' }) {
  const configurado = import.meta.env.VITE_LOGO_URL?.trim();
  const instituicao = import.meta.env.VITE_INSTITUICAO?.trim() || INSTITUICAO_PADRAO;
  const [falhou, setFalhou] = useState(false);
  const grande = contexto === 'cartao';

  /*
    Quem configura uma marca propria manda uma arte so; ela serve os dois usos.
    `||` e nao `??`: `VITE_LOGO_URL=` vazia e o que o .env.example traz, e com
    `??` isso viraria uma imagem de src vazio em vez de cair no padrao.
  */
  const arte = configurado || (grande ? logoPadrao : simboloPadrao);

  if (!falhou) {
    return (
      /*
        Placa branca nos dois contextos: a marca e desenhada para fundo claro e
        sumiria no azul do cabecalho e no tema escuro.
      */
      <div
        className={`inline-flex shrink-0 items-center justify-center bg-white ${
          grande ? 'rounded-2xl px-5 py-4' : 'rounded-lg px-2 py-1.5'
        }`}
      >
        <img
          src={arte}
          alt={instituicao}
          onError={() => setFalhou(true)}
          className={grande ? 'h-auto w-40' : 'h-8 w-auto max-w-32'}
        />
      </div>
    );
  }

  /*
    A arte nao carregou. Um icone de imagem quebrada no topo do login e pior
    que nenhuma imagem, entao entra a marca propria do aplicativo, com o nome
    escrito ao lado para nao perder quem opera a base.
  */
  const marcaPropria = (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${
        grande
          ? 'h-16 w-16 rounded-2xl bg-marca text-white'
          : 'h-9 w-9 rounded-lg bg-white/15 text-white'
      }`}
    >
      <svg viewBox="0 0 32 32" className={grande ? 'h-8 w-8' : 'h-5 w-5'} fill="currentColor">
        <path d="M13 4h6v9h9v6h-9v9h-6v-9H4v-6h9z" />
      </svg>
    </span>
  );

  if (!grande) return marcaPropria;

  return (
    <span className="flex flex-col items-center gap-2">
      {marcaPropria}
      <span className="text-sm font-semibold uppercase tracking-wide text-marca-clara">
        {instituicao}
      </span>
    </span>
  );
}

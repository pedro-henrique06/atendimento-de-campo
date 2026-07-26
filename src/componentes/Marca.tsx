import { useState } from 'react';

/**
 * Marca institucional do aplicativo.
 *
 * O logotipo não fica embutido no código: vem de `VITE_LOGO_URL`, e o nome da
 * instituição de `VITE_INSTITUICAO`. Assim a mesma build serve bases operadas
 * por instituições diferentes, e o logotipo exibido é sempre o que a
 * coordenação daquela operação configurou — não um que o aplicativo escolheu
 * por ela.
 *
 * O nome da instituição não é repetido ao lado do logotipo: um logotipo já
 * traz o nome escrito, e imprimir os dois só espremia o cabeçalho no celular.
 * Com logotipo, o nome vira o texto alternativo; sem logotipo, ele aparece na
 * tela, porque aí é a única coisa que identifica quem opera a base.
 *
 * A marca própria do aplicativo entra quando nada foi configurado ou quando a
 * imagem não carrega — em campo a rede cai, e um ícone de imagem quebrada no
 * topo do login é pior que nenhuma imagem.
 *
 * `contexto` diz onde a marca está: no cartão das telas abertas, cuja
 * superfície acompanha o tema, ou na barra azul do cabeçalho. Os dois pedem
 * fundos diferentes para continuar legíveis.
 */
export function Marca({ contexto = 'cartao' }: { contexto?: 'cartao' | 'cabecalho' }) {
  const logo = import.meta.env.VITE_LOGO_URL?.trim();
  const instituicao = import.meta.env.VITE_INSTITUICAO?.trim();
  const [falhou, setFalhou] = useState(false);
  const grande = contexto === 'cartao';

  if (logo && !falhou) {
    return (
      /*
        Placa branca nos dois contextos: logotipo institucional e desenhado
        para fundo claro e some sobre o azul do cabecalho ou sobre o tema
        escuro.
      */
      <div
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white ${
          grande ? 'px-4 py-3' : 'px-2 py-1.5'
        }`}
      >
        <img
          src={logo}
          alt={instituicao ?? ''}
          onError={() => setFalhou(true)}
          className={`w-auto object-contain ${grande ? 'h-12 max-w-56' : 'h-7 max-w-32'}`}
        />
      </div>
    );
  }

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

  if (grande && instituicao) {
    return (
      <span className="flex flex-col items-center gap-2">
        {marcaPropria}
        <span className="text-sm font-semibold uppercase tracking-wide text-marca-clara">
          {instituicao}
        </span>
      </span>
    );
  }

  return marcaPropria;
}

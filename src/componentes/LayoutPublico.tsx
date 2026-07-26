import type { ReactNode } from 'react';
import { IDIOMAS, rotuloIdioma, useI18n } from '../i18n';
import { Marca } from './Marca';
import type { Tema } from '../hooks/useTema';

/**
 * Cabeçalho das telas abertas — login e criação de conta. Idioma e tema ficam
 * acessíveis antes de entrar: quem opera em espanhol precisa disso já na
 * primeira tela, não depois de autenticar.
 */
export function CabecalhoPublico({
  tema,
  alternarTema,
}: {
  tema: Tema;
  alternarTema: () => void;
}) {
  const { idioma, definirIdioma } = useI18n();

  return (
    <header className="mx-auto mb-6 flex max-w-md items-center justify-between">
      <div className="flex rounded-full border border-borda bg-superficie p-1" role="group">
        {IDIOMAS.map((codigo) => (
          <button
            key={codigo}
            type="button"
            onClick={() => definirIdioma(codigo)}
            aria-pressed={idioma === codigo}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              idioma === codigo ? 'bg-superficie-2 text-marca-clara' : 'text-texto-suave'
            }`}
          >
            {rotuloIdioma[codigo]}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={alternarTema}
        aria-label={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-borda bg-superficie text-lg"
      >
        {tema === 'escuro' ? '☀️' : '🌙'}
      </button>
    </header>
  );
}

export function CartaoPublico({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <div className="cartao space-y-5">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Marca />
        </div>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="mt-1 text-texto-suave">{subtitulo}</p>
      </div>

      {children}
    </div>
  );
}

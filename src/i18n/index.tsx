import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Idioma } from '../api/tipos';
import { textos } from './textos';
import type { ChaveTexto } from './textos';

const CHAVE_IDIOMA = 'atendimento.idioma';

export const IDIOMAS: Idioma[] = ['Pt', 'Es', 'En'];

export const rotuloIdioma: Record<Idioma, string> = { Pt: 'PT', Es: 'ES', En: 'EN' };

interface ContextoI18n {
  idioma: Idioma;
  definirIdioma: (idioma: Idioma) => void;
  t: (chave: ChaveTexto) => string;
}

const Contexto = createContext<ContextoI18n | null>(null);

function idiomaInicial(): Idioma {
  const guardado = localStorage.getItem(CHAVE_IDIOMA) as Idioma | null;

  if (guardado && IDIOMAS.includes(guardado)) {
    return guardado;
  }

  // A equipe é mista e o público em campo fala espanhol; o idioma do aparelho
  // é o melhor palpite disponível antes de qualquer escolha explícita.
  const navegador = navigator.language.toLowerCase();
  if (navegador.startsWith('es')) return 'Es';
  if (navegador.startsWith('en')) return 'En';

  return 'Pt';
}

export function ProvedorI18n({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);

  useEffect(() => {
    localStorage.setItem(CHAVE_IDIOMA, idioma);
    document.documentElement.lang = idioma === 'Pt' ? 'pt-BR' : idioma === 'Es' ? 'es' : 'en';
  }, [idioma]);

  const t = useCallback((chave: ChaveTexto) => textos[idioma][chave], [idioma]);

  const valor = useMemo(
    () => ({ idioma, definirIdioma: setIdioma, t }),
    [idioma, t],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useI18n(): ContextoI18n {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error('useI18n precisa estar dentro de ProvedorI18n.');
  }

  return contexto;
}

/**
 * Traduz um valor de enum. Se a chave faltar, devolve o valor cru — mas isso
 * nunca deve acontecer: `enums.spec.ts` falha antes, na suíte de testes.
 */
export function traduzir<T extends string>(
  tabela: Record<Idioma, Record<T, string>>,
  idioma: Idioma,
  valor: T | null | undefined,
): string {
  if (!valor) return '—';
  return tabela[idioma][valor] ?? valor;
}

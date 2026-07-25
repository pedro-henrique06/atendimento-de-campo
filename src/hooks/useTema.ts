import { useCallback, useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro';

const CHAVE_TEMA = 'atendimento.tema';

function temaInicial(): Tema {
  const guardado = localStorage.getItem(CHAVE_TEMA) as Tema | null;

  if (guardado === 'claro' || guardado === 'escuro') {
    return guardado;
  }

  // Sem escolha explícita, segue o aparelho.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro';
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem(CHAVE_TEMA, tema);
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((atual) => (atual === 'escuro' ? 'claro' : 'escuro'));
  }, []);

  return { tema, alternar };
}

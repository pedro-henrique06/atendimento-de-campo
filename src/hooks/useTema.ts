import { useCallback, useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro';

const CHAVE_TEMA = 'atendimento.tema';

/**
 * O claro é o padrão. Só uma escolha explícita de quem usa muda isso — nem a
 * preferência do aparelho: um celular no modo escuro abriria o app escuro sem
 * ninguém ter pedido, e o padrão deixaria de ser padrão.
 */
function temaInicial(): Tema {
  const guardado = localStorage.getItem(CHAVE_TEMA) as Tema | null;

  return guardado === 'claro' || guardado === 'escuro' ? guardado : 'claro';
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  /*
    Grava so no clique, nao no efeito acima. Gravando no efeito, o tema
    calculado no primeiro carregamento virava uma "escolha" que ninguem fez, e
    trocar o padrao depois nao alcancaria mais quem ja tinha aberto o app uma
    vez.
  */
  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo = atual === 'escuro' ? 'claro' : 'escuro';
      localStorage.setItem(CHAVE_TEMA, proximo);
      return proximo;
    });
  }, []);

  return { tema, alternar };
}

import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIXO = 'atendimento.rascunho.';

/**
 * Rascunho local do formulário em andamento.
 *
 * Esta é a metade offline do app. O envio exige conexão, mas o que o
 * profissional já digitou nunca depende dela: o formulário é salvo no aparelho
 * a cada alteração e recuperado se a aba fechar, o navegador matar a página ou
 * o celular reiniciar no meio do atendimento. Perder uma anamnese digitada em
 * pé, no sol, é um custo alto demais para depender de sinal.
 *
 * O rascunho é apagado assim que o registro é aceito pelo servidor.
 */
export function useRascunho<T extends object>(chave: string, inicial: T) {
  const chaveCompleta = `${PREFIXO}${chave}`;
  const [recuperado, setRecuperado] = useState(false);

  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(chaveCompleta);

      if (guardado) {
        // Campos novos do formulário precisam existir mesmo em rascunho antigo.
        return { ...inicial, ...(JSON.parse(guardado) as T) };
      }
    } catch {
      // Rascunho corrompido não pode impedir o atendimento.
    }

    return inicial;
  });

  // Só sinaliza recuperação se havia algo guardado no primeiro render.
  const tinhaRascunho = useRef(localStorage.getItem(chaveCompleta) !== null);

  useEffect(() => {
    if (tinhaRascunho.current) {
      setRecuperado(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(chaveCompleta, JSON.stringify(valor));
    } catch {
      // Armazenamento cheio ou bloqueado: seguir sem rascunho é melhor que
      // travar o formulário.
    }
  }, [chaveCompleta, valor]);

  const descartar = useCallback(() => {
    localStorage.removeItem(chaveCompleta);
    tinhaRascunho.current = false;
    setRecuperado(false);
    setValor(inicial);
    // `inicial` é uma constante do módulo em todos os usos; incluí-la nas
    // dependências recriaria a função a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCompleta]);

  const limpar = useCallback(() => {
    localStorage.removeItem(chaveCompleta);
    tinhaRascunho.current = false;
    setRecuperado(false);
  }, [chaveCompleta]);

  return { valor, setValor, recuperado, descartar, limpar };
}

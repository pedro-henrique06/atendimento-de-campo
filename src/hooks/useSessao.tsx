import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, guardarToken, limparToken, lerToken } from '../api/cliente';
import type { Base, Profissional } from '../api/tipos';

const CHAVE_PROFISSIONAL = 'atendimento.profissional';
const CHAVE_BASE = 'atendimento.base';

interface ContextoSessao {
  profissional: Profissional | null;
  base: Base | null;
  autenticado: boolean;
  entrar: (dados: { token: string; profissional: Profissional }) => void;
  sair: () => void;
  definirBase: (base: Base | null) => void;
}

const Contexto = createContext<ContextoSessao | null>(null);

function ler<T>(chave: string): T | null {
  try {
    const guardado = localStorage.getItem(chave);
    return guardado ? (JSON.parse(guardado) as T) : null;
  } catch {
    return null;
  }
}

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [profissional, setProfissional] = useState<Profissional | null>(() =>
    lerToken() ? ler<Profissional>(CHAVE_PROFISSIONAL) : null,
  );

  const [base, setBase] = useState<Base | null>(() => ler<Base>(CHAVE_BASE));

  const entrar = useCallback(({ token, profissional: p }: { token: string; profissional: Profissional }) => {
    guardarToken(token);
    localStorage.setItem(CHAVE_PROFISSIONAL, JSON.stringify(p));
    setProfissional(p);
  }, []);

  const sair = useCallback(() => {
    limparToken();
    localStorage.removeItem(CHAVE_PROFISSIONAL);
    localStorage.removeItem(CHAVE_BASE);
    setProfissional(null);
    setBase(null);
  }, []);

  const definirBase = useCallback((nova: Base | null) => {
    if (nova) {
      localStorage.setItem(CHAVE_BASE, JSON.stringify(nova));
    } else {
      localStorage.removeItem(CHAVE_BASE);
    }

    setBase(nova);
  }, []);

  // A base guardada pode ter sido desativada entre um plantão e outro.
  useEffect(() => {
    if (!profissional || !base) return;

    let cancelado = false;

    api
      .bases()
      .then((bases) => {
        if (cancelado) return;

        const atual = bases.find((b) => b.id === base.id);
        if (!atual) definirBase(null);
      })
      .catch(() => {
        // Sem conexão, mantém a base escolhida: em campo, seguir trabalhando
        // com a última base conhecida é melhor que voltar para a seleção.
      });

    return () => {
      cancelado = true;
    };
    // Roda uma vez por sessão; revalidar a cada troca de base é desnecessário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profissional?.id]);

  const valor = useMemo(
    () => ({
      profissional,
      base,
      autenticado: profissional !== null && lerToken() !== null,
      entrar,
      sair,
      definirBase,
    }),
    [profissional, base, entrar, sair, definirBase],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): ContextoSessao {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error('useSessao precisa estar dentro de ProvedorSessao.');
  }

  return contexto;
}

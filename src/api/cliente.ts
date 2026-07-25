import type {
  AtendimentoResumo,
  Base,
  Cid10,
  ClassificacaoRisco,
  Especialidade,
  ItemCatalogo,
  Prontuario,
  RespostaLogin,
  SugestaoStart,
} from './tipos';

const CHAVE_TOKEN = 'atendimento.token';

/** Erro da API com a lista de mensagens que o formulário exibe campo a campo. */
export class ErroApi extends Error {
  readonly status: number;
  readonly erros: string[];

  constructor(status: number, erros: string[]) {
    super(erros.join(' '));
    this.name = 'ErroApi';
    this.status = status;
    this.erros = erros;
  }
}

/**
 * Erro de rede. Distinguir isso de erro do servidor importa: em campo a maior
 * causa de falha e falta de sinal, e a tela precisa oferecer "tentar de novo"
 * em vez de acusar o preenchimento.
 */
export class ErroDeRede extends Error {
  constructor() {
    super('sem_conexao');
    this.name = 'ErroDeRede';
  }
}

export function lerToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function guardarToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function limparToken(): void {
  localStorage.removeItem(CHAVE_TOKEN);
}

async function requisitar<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<T> {
  const token = lerToken();

  let resposta: Response;

  try {
    resposta = await fetch(`/api${caminho}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opcoes.headers,
      },
    });
  } catch {
    throw new ErroDeRede();
  }

  if (resposta.status === 401) {
    limparToken();
    throw new ErroApi(401, ['sessao_expirada']);
  }

  if (!resposta.ok) {
    const erros = await extrairErros(resposta);
    throw new ErroApi(resposta.status, erros);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  return (await resposta.json()) as T;
}

async function extrairErros(resposta: Response): Promise<string[]> {
  try {
    const corpo = await resposta.json();

    if (Array.isArray(corpo?.erros)) {
      return corpo.erros as string[];
    }

    if (typeof corpo?.erro === 'string') {
      return [corpo.erro];
    }

    // ProblemDetails de validacao do ASP.NET Core.
    if (corpo?.errors && typeof corpo.errors === 'object') {
      return Object.values(corpo.errors as Record<string, string[]>).flat();
    }

    return ['erro_inesperado'];
  } catch {
    return ['erro_inesperado'];
  }
}

export const api = {
  login(dados: {
    nome: string;
    funcao: string;
    registro?: string;
    senha: string;
    idioma: string;
  }): Promise<RespostaLogin> {
    return requisitar<RespostaLogin>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  bases(): Promise<Base[]> {
    return requisitar<Base[]>('/bases');
  },

  atendimentos(filtros: {
    baseId: string;
    fila?: Especialidade | null;
    risco?: ClassificacaoRisco | null;
    busca?: string;
  }): Promise<AtendimentoResumo[]> {
    const params = new URLSearchParams({ baseId: filtros.baseId });

    if (filtros.fila) params.set('fila', filtros.fila);
    if (filtros.risco) params.set('risco', filtros.risco);
    if (filtros.busca) params.set('busca', filtros.busca);

    return requisitar<AtendimentoResumo[]>(`/atendimentos?${params}`);
  },

  prontuario(id: string): Promise<Prontuario> {
    return requisitar<Prontuario>(`/atendimentos/${id}`);
  },

  criarAtendimento(corpo: unknown): Promise<Prontuario> {
    return requisitar<Prontuario>('/atendimentos', {
      method: 'POST',
      body: JSON.stringify(corpo),
    });
  },

  registrarTriagem(id: string, corpo: unknown): Promise<SugestaoStart | null> {
    return requisitar<SugestaoStart | null>(`/atendimentos/${id}/triagem`, {
      method: 'PUT',
      body: JSON.stringify(corpo),
    });
  },

  registrarConsulta(id: string, corpo: unknown): Promise<void> {
    return requisitar<void>(`/atendimentos/${id}/consulta`, {
      method: 'PUT',
      body: JSON.stringify(corpo),
    });
  },

  registrarOdontologia(id: string, corpo: unknown): Promise<void> {
    return requisitar<void>(`/atendimentos/${id}/odontologia`, {
      method: 'PUT',
      body: JSON.stringify(corpo),
    });
  },

  registrarEnfermagem(id: string, corpo: unknown): Promise<void> {
    return requisitar<void>(`/atendimentos/${id}/enfermagem`, {
      method: 'PUT',
      body: JSON.stringify(corpo),
    });
  },

  finalizar(id: string): Promise<void> {
    return requisitar<void>(`/atendimentos/${id}/finalizar`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  reabrir(id: string, justificativa: string): Promise<void> {
    return requisitar<void>(`/atendimentos/${id}/reabrir`, {
      method: 'POST',
      body: JSON.stringify({ justificativa }),
    });
  },

  itensCatalogo(busca: string): Promise<ItemCatalogo[]> {
    return requisitar<ItemCatalogo[]>(`/catalogo/itens?busca=${encodeURIComponent(busca)}`);
  },

  cid10(busca: string): Promise<Cid10[]> {
    return requisitar<Cid10[]>(`/catalogo/cid10?busca=${encodeURIComponent(busca)}`);
  },
};

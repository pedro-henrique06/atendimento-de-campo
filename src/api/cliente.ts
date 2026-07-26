import type {
  AtendimentoResumo,
  Base,
  Cid10,
  ClassificacaoRisco,
  Especialidade,
  ItemCatalogo,
  MotivoRecusaLogin,
  Profissional,
  Prontuario,
  RespostaLogin,
  StatusConta,
  SugestaoStart,
  UsuarioDisponivel,
} from './tipos';

const CHAVE_TOKEN = 'atendimento.token';

/**
 * Base da API.
 *
 * Em desenvolvimento fica vazia e o proxy do Vite encaminha `/api` para o
 * backend local. Em produção o build é estático e não existe proxy nenhum:
 * sem `VITE_API_URL`, toda chamada cairia no servidor de arquivos e voltaria
 * 404 — ou, pior, o `index.html` com status 200.
 *
 * A variável é lida em tempo de build, então precisa estar definida no serviço
 * do front antes de publicar, não depois.
 */
export const BASE_API = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

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
 * Login recusado. Carrega o motivo em código para a tela poder explicar o que
 * houve — conta ainda pendente é bem diferente de senha errada, e tratar as
 * duas como a mesma coisa faria a pessoa tentar de novo sem entender.
 */
export class ErroLogin extends Error {
  readonly motivo: MotivoRecusaLogin;
  readonly detalhe: string | null;

  constructor(motivo: MotivoRecusaLogin, detalhe: string | null) {
    super(motivo);
    this.name = 'ErroLogin';
    this.motivo = motivo;
    this.detalhe = detalhe;
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
    resposta = await fetch(`${BASE_API}/api${caminho}`, {
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
    const corpo = await lerCorpo(resposta);

    // No login o 401 significa credencial ou situação da conta, e o corpo traz
    // o motivo. Fora dele, significa sessão expirada.
    if (typeof corpo?.motivo === 'string') {
      const detalhe = typeof corpo.detalhe === 'string' ? corpo.detalhe : '';
      throw new ErroApi(401, [corpo.motivo, detalhe]);
    }

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

async function lerCorpo(resposta: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await resposta.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
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
  async login(dados: {
    usuario: string;
    senha: string;
    idioma: string;
  }): Promise<RespostaLogin> {
    try {
      return await requisitar<RespostaLogin>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dados),
      });
    } catch (erro) {
      // O 401 do login não é sessão expirada: é credencial ou situação da
      // conta, e a tela precisa dessa distinção para orientar a pessoa.
      if (erro instanceof ErroApi && erro.status === 401) {
        throw new ErroLogin(
          (erro.erros[0] as MotivoRecusaLogin) ?? 'CredenciaisInvalidas',
          erro.erros[1] ?? null,
        );
      }

      throw erro;
    }
  },

  registrar(dados: {
    usuario: string;
    nome: string;
    email?: string | null;
    funcao: string;
    registro?: string | null;
    senha: string;
    confirmacaoSenha: string;
    idioma: string;
  }): Promise<Profissional> {
    return requisitar<Profissional>('/auth/registrar', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  },

  usuarioDisponivel(usuario: string): Promise<UsuarioDisponivel> {
    return requisitar<UsuarioDisponivel>(
      `/auth/usuario-disponivel?usuario=${encodeURIComponent(usuario)}`,
    );
  },

  profissionais(filtros: { status?: StatusConta | null; busca?: string }): Promise<Profissional[]> {
    const params = new URLSearchParams();

    if (filtros.status) params.set('status', filtros.status);
    if (filtros.busca) params.set('busca', filtros.busca);

    return requisitar<Profissional[]>(`/profissionais?${params}`);
  },

  contarPendentes(): Promise<number> {
    return requisitar<number>('/profissionais/pendentes/total');
  },

  aprovarConta(id: string): Promise<Profissional> {
    return requisitar<Profissional>(`/profissionais/${id}/aprovar`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  recusarConta(id: string, motivo: string): Promise<Profissional> {
    return requisitar<Profissional>(`/profissionais/${id}/recusar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  },

  desativarConta(id: string): Promise<Profissional> {
    return requisitar<Profissional>(`/profissionais/${id}/desativar`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  definirAdministrador(id: string, ehAdministrador: boolean): Promise<Profissional> {
    return requisitar<Profissional>(`/profissionais/${id}/administrador`, {
      method: 'POST',
      body: JSON.stringify({ ehAdministrador }),
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

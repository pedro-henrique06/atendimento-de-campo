/**
 * Cliente da API para o roteiro de ponta a ponta.
 *
 * Fala o mesmo protocolo que `src/api/cliente.ts`, mas de propósito não o
 * reaproveita: o roteiro existe para conferir que a API responde o que o app
 * espera, e importar o cliente do app faria os dois concordarem por construção.
 * Um erro de contrato — campo renomeado, enum reordenado — passaria batido.
 */

const PADRAO = 'http://localhost:5080';

export const BASE_API = (process.env.E2E_API ?? PADRAO).replace(/\/$/, '');

/**
 * O roteiro cria contas com senha escrita no repositório e deixa dezenas de
 * pacientes de mentira para trás. Apontar isso para uma base de verdade
 * misturaria paciente fictício com prontuário real, e não há como separar
 * depois. Então o alvo é local, salvo quem assumir a conta por escrito.
 */
export function conferirAlvo() {
  const { hostname } = new URL(BASE_API);
  const local = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname);

  if (!local && process.env.E2E_PERMITIR_REMOTO !== '1') {
    throw new Error(
      `A suíte cria contas e pacientes de mentira, e ${hostname} não é local.\n` +
        'Se é mesmo isso que você quer, rode com E2E_PERMITIR_REMOTO=1.',
    );
  }
}

export class ErroDaApi extends Error {
  constructor(metodo, caminho, status, corpo) {
    super(`${metodo} ${caminho} → ${status}: ${mensagemDe(corpo)}`);
    this.name = 'ErroDaApi';
    this.status = status;
    this.corpo = corpo;
  }
}

function mensagemDe(corpo) {
  if (typeof corpo === 'string') return corpo.slice(0, 400);
  if (!corpo) return '(sem corpo)';
  if (Array.isArray(corpo.erros)) return corpo.erros.join(' / ');
  if (corpo.errors) return JSON.stringify(corpo.errors);
  return JSON.stringify(corpo).slice(0, 400);
}

/**
 * Um interlocutor da API: ou anônimo, ou com o token de alguém.
 *
 * Cada profissional do elenco carrega o seu, porque metade do que o roteiro
 * confere é justamente quem fez o quê — o autor de cada registro sai do token,
 * e um cliente compartilhado atribuiria tudo à mesma pessoa.
 */
export function cliente(token = null) {
  async function pedir(metodo, caminho, corpo) {
    const resposta = await fetch(`${BASE_API}/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });

    const texto = await resposta.text();
    let lido = null;

    if (texto) {
      try {
        lido = JSON.parse(texto);
      } catch {
        lido = texto;
      }
    }

    if (!resposta.ok) throw new ErroDaApi(metodo, caminho, resposta.status, lido);

    return lido;
  }

  return {
    token,
    pedir,
    get: (caminho) => pedir('GET', caminho),
    post: (caminho, corpo) => pedir('POST', caminho, corpo),
    put: (caminho, corpo) => pedir('PUT', caminho, corpo),
    del: (caminho) => pedir('DELETE', caminho),

    /** O inverso: espera a recusa, e devolve o erro para quem quer lê-lo. */
    async recusa(metodo, caminho, corpo) {
      try {
        await pedir(metodo, caminho, corpo);
      } catch (erro) {
        if (erro instanceof ErroDaApi) return erro;
        throw erro;
      }

      throw new Error(`${metodo} ${caminho} foi aceito, e devia ter sido recusado.`);
    },
  };
}

export async function entrar(usuario, senha) {
  const resposta = await cliente().post('/auth/login', { usuario, senha });

  return { ...resposta, cliente: cliente(resposta.token) };
}

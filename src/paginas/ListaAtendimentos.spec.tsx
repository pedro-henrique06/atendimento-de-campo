import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { AtendimentoResumo, Profissional } from '../api/tipos';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { INTERVALO_ATUALIZACAO, ListaAtendimentos } from './ListaAtendimentos';

const DENTISTA: Profissional = {
  id: 'p1',
  usuario: 'ana.dentista',
  nome: 'Ana Dentista',
  email: null,
  funcao: 'Dentista',
  conselhoTipo: 'Cro',
  registro: '1234',
  idioma: 'Pt',
  status: 'Ativa',
  ehAdministrador: false,
  motivoRecusa: null,
  criadoEm: '2026-01-01T12:00:00Z',
  filas: ['Odontologia'],
  precisaTrocarSenha: false,
};

function atendimento(sobre: Partial<AtendimentoResumo> = {}): AtendimentoResumo {
  return {
    id: 'a1',
    codigo: 'ACA-4K7Z',
    pacienteNome: 'Yesenia Navarro',
    status: 'EmAndamento',
    classificacaoRisco: 'Verde',
    resumo: 'Dor de dente',
    etapas: [
      {
        id: 'e1',
        especialidade: 'Odontologia',
        status: 'Aguardando',
        profissional: null,
        iniciadaEm: null,
        concluidaEm: null,
        assumidaEm: null,
        encaminhadaPor: null,
        encaminhadaDe: null,
        entrouNaFilaEm: null,
      },
    ],
    criadoEm: '2026-07-26T12:00:00Z',
    finalizadoEm: null,
    desfecho: null,
    ...sobre,
  };
}

/** Coloca a sessão no ar antes de renderizar, como o login faria. */
function renderizar(profissional: Profissional = DENTISTA) {
  localStorage.setItem('atendimento.token', 'token-de-teste');
  localStorage.setItem('atendimento.profissional', JSON.stringify(profissional));
  localStorage.setItem(
    'atendimento.base',
    JSON.stringify({ id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true }),
  );

  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter>
          <ListaAtendimentos />
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'atendimentos').mockResolvedValue([atendimento()]);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Fila de atendimentos', () => {
  it('abre na fila da função de quem entrou', async () => {
    // Antes abria sempre em "Triagem": o dentista via a fila da enfermagem e
    // tinha que descobrir sozinho onde ficava a dele.
    renderizar();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Odontologia' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );

    await waitFor(() =>
      expect(api.atendimentos).toHaveBeenCalledWith(
        expect.objectContaining({ fila: 'Odontologia', ocultarAssumidos: true }),
      ),
    );
  });

  it('as filas novas aparecem na barra', async () => {
    renderizar();

    // Ultrassom e farmácia são filas derivadas — ninguém chega nelas sem alguém
    // ter mandado —, mas precisam estar na barra: é por ali que quem atende
    // nelas encontra o próprio trabalho.
    expect(await screen.findByRole('button', { name: 'Ultrassom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Farmácia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ginecologia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cirurgia' })).toBeInTheDocument();
  });

  it('a fila da profissão abre primeiro, mesmo sendo nova', async () => {
    renderizar({ ...DENTISTA, funcao: 'Ultrassonografista', filas: ['Ultrassom'] });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ultrassom' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('não esconde as outras filas — em campo as funções se cobrem', async () => {
    renderizar();

    expect(await screen.findByRole('button', { name: 'Todas as filas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Triagem' })).toBeInTheDocument();
  });

  it('mostra quem está com o paciente e não oferece assumir', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Carlos Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
            assumidaEm: null,
            encaminhadaPor: null,
            encaminhadaDe: null,
            entrouNaFilaEm: null,
          },
        ],
      }),
    ]);

    renderizar();

    expect(await screen.findByText(/Carlos Dentista/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assumir' })).not.toBeInTheDocument();
  });

  it('assume o paciente e recarrega a fila', async () => {
    const assumir = vi.spyOn(api, 'assumirEtapa').mockResolvedValue(atendimento());

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Assumir' }));

    expect(assumir).toHaveBeenCalledWith('a1', 'Odontologia');
  });

  it('assumir não navega para o prontuário', async () => {
    // O cartão inteiro é um link; sem parar o evento, o clique faria as duas
    // coisas e a pessoa sairia da fila sem querer.
    vi.spyOn(api, 'assumirEtapa').mockResolvedValue(atendimento());

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Assumir' }));

    expect(await screen.findByRole('button', { name: 'Odontologia' })).toBeInTheDocument();
  });

  it('mostra a recusa do servidor com o nome de quem já pegou', async () => {
    vi.spyOn(api, 'assumirEtapa').mockRejectedValue(
      new ErroApi(400, ['Este atendimento ja esta com Carlos Dentista.']),
    );

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Assumir' }));

    // Sem o nome, a equipe fica sem saber a quem perguntar.
    expect(await screen.findByText(/Carlos Dentista/)).toBeInTheDocument();
  });

  it('no que já é meu, o botão devolve para a fila', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Ana Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
            assumidaEm: null,
            encaminhadaPor: null,
            encaminhadaDe: null,
            entrouNaFilaEm: null,
          },
        ],
      }),
    ]);
    const liberar = vi.spyOn(api, 'liberarEtapa').mockResolvedValue(atendimento());

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Devolver à fila' }));

    expect(liberar).toHaveBeenCalledWith('a1', 'Odontologia');
  });

  it('separa quem está comigo de quem está esperando', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        id: 'a1',
        pacienteNome: 'Comigo Agora',
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Ana Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
            assumidaEm: '2026-07-26T12:30:00Z',
            encaminhadaPor: null,
            encaminhadaDe: null,
            entrouNaFilaEm: null,
          },
        ],
      }),
      atendimento({ id: 'a2', pacienteNome: 'Esperando Ainda' }),
    ]);

    renderizar();

    // A API já traz os dois juntos — esconde só o que está com outra pessoa.
    // Sem separar, o paciente que estou atendendo fica perdido na fila.
    expect(await screen.findByRole('heading', { name: /Atendendo agora/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Aguardando/i })).toBeInTheDocument();
  });

  it('a lista fala do estado da etapa desta fila, e não do atendimento', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        // O atendimento está "Em andamento" — o paciente já foi triado e está
        // no posto —, mas quem olha a fila da odontologia quer saber se *esta*
        // fila já pegou o paciente.
        status: 'EmAndamento',
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Ana Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
            assumidaEm: '2026-07-26T12:30:00Z',
            encaminhadaPor: null,
            encaminhadaDe: null,
            entrouNaFilaEm: null,
          },
        ],
      }),
    ]);

    renderizar();

    // Quem diz o estado da etapa é o título do grupo, e o cartão diz que o
    // paciente está comigo. Repetir "Em andamento" em cada linha, embaixo de um
    // título que já diz isso, era dizer duas vezes e gastar o canto onde o
    // estado diferente — com outra pessoa — precisa aparecer.
    expect(await screen.findByRole('heading', { name: /Atendendo agora/i })).toBeInTheDocument();
    expect(screen.getByText(/Com você/i)).toBeInTheDocument();

    // E o estado do atendimento inteiro não aparece na linha do paciente.
    expect(screen.queryByText(/Em andamento/)).not.toBeInTheDocument();
  });

  /*
    O cartão da fila, depois do redesenho.

    Era um cartão de ~300px para três informações, com o nome truncado depois do
    código e o risco num ponto de 12px. Cabiam três pacientes numa tela de
    celular.
  */
  it('mostra o nome inteiro, e não truncado atrás do código', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({ pacienteNome: 'Yesenia Navarro Quintero De La Cruz' }),
    ]);

    renderizar();

    // Num elemento só: cortado, dois pacientes diferentes leem igual, e é pelo
    // nome que se chama alguém na tenda.
    expect(await screen.findByText('Yesenia Navarro Quintero De La Cruz')).toBeInTheDocument();
  });

  it('diz o risco por escrito, e não só pela cor', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({ classificacaoRisco: 'Vermelho' }),
    ]);

    renderizar();

    // O risco é o critério de ordenação do START. Como ponto de 12px ele existia
    // para quem enxerga cor e para mais ninguém.
    expect(await screen.findByText('Vermelho')).toBeInTheDocument();
  });

  it('mostra há quanto tempo o paciente espera na fila', async () => {
    const quarentaMinutosAtras = new Date(Date.now() - 40 * 60_000).toISOString();

    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'Aguardando',
            profissional: null,
            iniciadaEm: null,
            concluidaEm: null,
            assumidaEm: null,
            encaminhadaPor: null,
            encaminhadaDe: null,
            entrouNaFilaEm: quarentaMinutosAtras,
          },
        ],
      }),
    ]);

    renderizar();

    // Junto da cor do risco, é o que decide quem passa na frente — e não
    // existia em lugar nenhum da tela.
    expect(await screen.findByText('40 min')).toBeInTheDocument();
  });

  it('quem já está sendo atendido mostra o tempo de atendimento, não a espera', async () => {
    const duasHorasAtras = new Date(Date.now() - 120 * 60_000).toISOString();
    const dezMinutosAtras = new Date(Date.now() - 10 * 60_000).toISOString();

    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Ana Dentista',
            iniciadaEm: dezMinutosAtras,
            concluidaEm: null,
            assumidaEm: dezMinutosAtras,
            encaminhadaPor: null,
            encaminhadaDe: null,
            entrouNaFilaEm: duasHorasAtras,
          },
        ],
      }),
    ]);

    renderizar();

    // São perguntas diferentes: quanto esperou, e há quanto tempo está comigo.
    // Somadas, todo atendimento pareceria durar o plantão inteiro.
    expect(await screen.findByText('10 min')).toBeInTheDocument();
    expect(screen.queryByText('2h')).not.toBeInTheDocument();
  });

  it('a fila vazia de uma seção não deixa o título órfão', async () => {
    // Só há quem espera: "Atendendo agora" não pode aparecer com zero embaixo.
    renderizar();

    expect(await screen.findByRole('heading', { name: /^Aguardando/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Atendendo agora/i })).not.toBeInTheDocument();
  });

  it('em "Todas" não agrupa, porque a lista mistura filas', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Todas as filas' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /^Aguardando/i })).not.toBeInTheDocument(),
    );
  });

  it('em "Todas" não oferece assumir, porque a lista mistura filas', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Todas as filas' }));

    await waitFor(() =>
      expect(api.atendimentos).toHaveBeenCalledWith(
        expect.objectContaining({ fila: null, ocultarAssumidos: false }),
      ),
    );

    expect(screen.queryByRole('button', { name: 'Assumir' })).not.toBeInTheDocument();
  });

  it('em "Todas" ainda mostra quem está com o paciente', async () => {
    // É ali que a coordenação olha a operação inteira: esconder o dono deixaria
    // parecer que ninguém pegou.
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Carlos Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
            assumidaEm: null,
            encaminhadaPor: null,
            encaminhadaDe: null,
            entrouNaFilaEm: null,
          },
        ],
      }),
    ]);

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Todas as filas' }));

    expect(await screen.findByText(/Carlos Dentista/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assumir' })).not.toBeInTheDocument();
  });

  it('"Meus" lista só o que esta pessoa assumiu', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Meus' }));

    await waitFor(() =>
      expect(api.atendimentos).toHaveBeenCalledWith(expect.objectContaining({ meus: true })),
    );
  });
});

/**
 * A fila se atualizando sozinha é o que faz o encaminhamento chegar: sem isso,
 * quem recebe o paciente só descobre ao recarregar a página.
 *
 * Estes testes correm com relógio falso e sem `waitFor` de propósito — o
 * `waitFor` da testing-library não reconhece os timers do vitest e ficaria
 * esperando um relógio que não anda.
 */
describe('Atualização da fila', () => {
  /** Anda com o relógio e deixa as respostas pendentes chegarem à tela. */
  async function avancar(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  async function definirVisibilidade(estado: DocumentVisibilityState) {
    Object.defineProperty(document, 'visibilityState', {
      value: estado,
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await definirVisibilidade('visible');
    vi.useRealTimers();
  });

  it('busca a fila de novo sem ninguém recarregar a página', async () => {
    renderizar();
    await avancar(0);

    expect(api.atendimentos).toHaveBeenCalledTimes(1);

    await avancar(INTERVALO_ATUALIZACAO);

    expect(api.atendimentos).toHaveBeenCalledTimes(2);
  });

  it('para de buscar quando a aba sai de vista', async () => {
    renderizar();
    await avancar(0);

    await definirVisibilidade('hidden');
    await avancar(INTERVALO_ATUALIZACAO * 3);

    // O aparelho passa boa parte do plantão no bolso. Buscar uma lista que
    // ninguém está olhando gasta bateria e dados à toa.
    expect(api.atendimentos).toHaveBeenCalledTimes(1);
  });

  it('busca na hora quando a aba volta', async () => {
    renderizar();
    await avancar(0);

    await definirVisibilidade('hidden');
    await definirVisibilidade('visible');
    await avancar(0);

    // Esperar mais quinze segundos justo quando a pessoa olha a fila seria a
    // hora errada de estar desatualizado.
    expect(api.atendimentos).toHaveBeenCalledTimes(2);
  });

  it('falha na atualização de fundo não apaga a fila', async () => {
    renderizar();
    await avancar(0);

    expect(screen.getByText(/Yesenia Navarro/)).toBeInTheDocument();

    vi.mocked(api.atendimentos).mockRejectedValueOnce(new ErroDeRede());
    await avancar(INTERVALO_ATUALIZACAO);

    // Em campo o sinal cai o tempo todo. Uma fila que some sozinha a cada
    // quinze segundos é pior que uma fila desatualizada.
    expect(screen.getByText(/Yesenia Navarro/)).toBeInTheDocument();
    expect(screen.queryByText(/Sem conexão/)).not.toBeInTheDocument();
  });

  it('resposta atrasada não sobrescreve a fila que está na tela', async () => {
    let responderAtrasada: (lista: AtendimentoResumo[]) => void = () => {};

    vi.mocked(api.atendimentos)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            responderAtrasada = resolve;
          }),
      )
      .mockResolvedValue([atendimento({ id: 'a2', pacienteNome: 'Paciente Atual' })]);

    renderizar();
    await avancar(0);

    // A segunda busca responde primeiro e é a que vale.
    await avancar(INTERVALO_ATUALIZACAO);
    expect(screen.getByText(/Paciente Atual/)).toBeInTheDocument();

    await act(async () => {
      responderAtrasada([atendimento({ id: 'a3', pacienteNome: 'Resposta Antiga' })]);
    });

    // Com duas buscas em voo o tempo todo, deixar a mais lenta escrever na tela
    // mostraria a fila de antes como se fosse a de agora.
    expect(screen.queryByText(/Resposta Antiga/)).not.toBeInTheDocument();
    expect(screen.getByText(/Paciente Atual/)).toBeInTheDocument();
  });
});

describe('Fila sem função definida', () => {
  it('cai em "Todas" quando a função não mapeia fila nenhuma', async () => {
    // Conta antiga, gravada antes das filas existirem: não pode abrir vazia.
    renderizar({ ...DENTISTA, filas: [] });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Todas as filas' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });
});

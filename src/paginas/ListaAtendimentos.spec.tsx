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
      },
    ],
    criadoEm: '2026-07-26T12:00:00Z',
    finalizadoEm: null,
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
          },
        ],
      }),
    ]);

    renderizar();

    expect(await screen.findByText('Carlos Dentista')).toBeInTheDocument();
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
          },
        ],
      }),
    ]);

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Todas as filas' }));

    expect(await screen.findByText('Carlos Dentista')).toBeInTheDocument();
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
